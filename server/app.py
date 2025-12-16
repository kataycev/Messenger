# app.py
from fastapi import FastAPI, Query, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, and_, or_, case
from database import SessionLocal, engine
from models import Base, User, Messages, Actions
from auth import hash_password, verify_password, create_access_token, decode_token
from jose import JWTError
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
import asyncio
from datetime import date
import time

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or set to ["http://localhost:5500"] if you serve HTML from there
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic schemas
class UserCreate(BaseModel):
    username: str
    password: str

class UserPublic(BaseModel):
    id: int
    username: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MessageCreate(BaseModel):
    from_user: str
    to_user: str
    message: str

class Chats(BaseModel):
    id: int
    from_user: str
    to_user: str
    message: str
    
    model_config = {
        "from_attributes": True
    }

class Chat(BaseModel):
    id: int
    from_user: str
    to_user: str
    message: str
    
    model_config = {
        "from_attributes": True
    }

class Action(BaseModel):
    id: int
    user: str
    action: str
    date: str
    time: str

# Registration endpoint
@app.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check for existing user
    existing = db.query(User).filter((User.username == user.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    new_user = User(
        username=user.username,
        password_hash=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    local_time = time.localtime(time.time())
    action = Actions(
        user = user.username,
        action = 'register',
        date = f'{date.today()}',
        time = f'{local_time.tm_hour}:{local_time.tm_min}:{local_time.tm_sec}'
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    token = create_access_token(data={"sub": new_user.username})
    return {"access_token": token}

# Login endpoint (OAuth2 compatible)
@app.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if form_data.username != 'admin':
        local_time = time.localtime(time.time())
        action = Actions(
            user = form_data.username,
            action = 'logged in',
            date = f'{date.today()}',
            time = f'{local_time.tm_hour}:{local_time.tm_min}:{local_time.tm_sec}'
        )
        db.add(action)
        db.commit()
        db.refresh(action)

    token = create_access_token(data={"sub": user.username})
    return {"access_token": token}

# Get current user from token
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user

# Protected route
@app.get("/me")
def read_me(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username
    }

# Get all users from DataBase
@app.get("/search_users", response_model=List[UserPublic])
def get_all_users(token: str = Depends(oauth2_scheme), query: Optional[str] = Query(None), db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):

    print(query)
    users = db.query(User).filter(User.username.ilike(f'%{query}%')).all()
    if not users or len(users) == 0 or query == current_user.username or query == 'admin':
        raise HTTPException(status_code=401, detail="Users not found")

    return users

# Initialize web-sockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {
            'chats': {},
            'chat': {}
        }

    async def connect(self, websocket: WebSocket, type: str, username: str):
        await websocket.accept()
        self.active_connections[type][username] = websocket

    def disconnect(self, type: str, username: str):
        if username in self.active_connections[type]:
            del self.active_connections[type][username]

    async def send_message_from_user(self, message, websocket: WebSocket):
        await websocket.send_json(message)

    async def send_chats(self, data, websocket: WebSocket):
        await websocket.send_json(data)

manager = ConnectionManager()

@app.websocket("/ws/chats")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    token = websocket.query_params.get('token')

    try:
        payload = decode_token(token)
        username = payload.get("sub")
        if username is None:
            await websocket.close(code=1008)
            return
    except JWTError:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, 'chats', username)

    try:
        while True:


            user1 = case(
                (Messages.from_user < Messages.to_user, Messages.from_user),
                else_=Messages.to_user
            ).label('user1')

            user2 = case(
                (Messages.from_user > Messages.to_user, Messages.from_user),
                else_=Messages.to_user
            ).label('user2')

            latest_subq = (
                db.query(
                    user1,
                    user2,
                    func.max(Messages.id).label('latest_id')
                )
                .filter(or_(Messages.from_user == username, Messages.to_user == username))
                .group_by(user1, user2)
            ).subquery()

            results = (
                db.query(Messages)
                .join(
                    latest_subq,
                    and_(
                        case(
                            (Messages.from_user < Messages.to_user, Messages.from_user),
                            else_=Messages.to_user
                        ) == latest_subq.c.user1,
                        case(
                            (Messages.from_user > Messages.to_user, Messages.from_user),
                            else_=Messages.to_user
                        ) == latest_subq.c.user2,
                        Messages.id == latest_subq.c.latest_id
                    )
                )
                .filter(or_(Messages.from_user == username, Messages.to_user == username)).order_by(Messages.id.asc())
                .all()
            )

            data = [Chats.model_validate(m).model_dump() for m in results]

            await manager.send_chats(data, websocket)

            await asyncio.sleep(2)

    except WebSocketDisconnect:
        manager.disconnect('chats', username)
        local_time = time.localtime(time.time())
        action = Actions(
            user = username,
            action = 'Reload/logged out',
            date = f'{date.today()}',
            time = f'{local_time.tm_hour}:{local_time.tm_min}:{local_time.tm_sec}'
        )
        db.add(action)
        db.commit()
        db.refresh(action)


@app.websocket("/ws/chat/{from_username}")
async def websocket_endpoint(websocket: WebSocket, from_username: str, db: Session = Depends(get_db)):
    token = websocket.query_params.get('token')

    try:
        payload = decode_token(token)
        username = payload.get("sub")
        if username is None:
            await websocket.close(code=1008)
            return
    except JWTError:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, 'chat', username)

    local_time = time.localtime(time.time())
    action = Actions(
        user = username,
        action = f'Enter chat {from_username}',
        date = f'{date.today()}',
        time = f'{local_time.tm_hour}:{local_time.tm_min}:{local_time.tm_sec}'
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    async def send_messages_loop():
        latest_msg_id = 0
        while True:
            query = db.query(Messages).filter(
                or_(
                    and_(Messages.from_user == from_username, Messages.to_user == username, latest_msg_id < Messages.id),
                    and_(Messages.from_user == username, Messages.to_user == from_username, latest_msg_id < Messages.id)
                )
            ).order_by(Messages.id.asc()).all()

            data = [Chats.model_validate(m).model_dump() for m in query]

            if data:
                latest_msg_id = data[-1]['id']
                await manager.send_message_from_user(data, websocket)

            await asyncio.sleep(2)

    async def receive_messages_loop():
        while True:
            try:
                received_message = await websocket.receive_text()
                print(received_message)
                if received_message:
                    new_message = Messages(
                        from_user=username,
                        to_user=from_username,
                        message=received_message
                    )
                    db.add(new_message)
                    db.commit()
                    db.refresh(new_message)
            except WebSocketDisconnect:
                break

    try:
        send_task = asyncio.create_task(send_messages_loop())
        receive_task = asyncio.create_task(receive_messages_loop())

        done, pending = await asyncio.wait(
            [send_task, receive_task],
            return_when=asyncio.FIRST_COMPLETED
        )

        for task in pending:
            task.cancel()

    finally:
        manager.disconnect('chat', username)
        try:
            await websocket.close()
        except RuntimeError:
            pass

@app.get("/get_all_users", response_model=List[UserPublic])
def get_all_users(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.id.asc()).all()
    return users

@app.get("/get_users_messages", response_model=List[Chats])
def get_all_users(from_user: str, to_user: str, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):

    print(from_user, to_user)
    users = db.query(Messages).filter(Messages.from_user == from_user, Messages.to_user == to_user).all()
    if not users:
        raise HTTPException(status_code=401, detail="Users not found or incorect request")

    return users

@app.get("/get_users_actions", response_model=List[Action])
def get_all_users(username: str, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):

    if username == 'all':
        data = db.query(Actions).order_by(Actions.user).all()
    else:
        data = db.query(Actions).filter(Actions.user == username).order_by(Actions.id.asc()).all()

    if not username or username == 'admin' or len(data) == 0:
        raise HTTPException(status_code=401, detail="User not found or incorect request")

    return data