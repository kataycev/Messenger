# models.py
from sqlalchemy import Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)

class Messages(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    from_user = Column(String, index=True)
    to_user = Column(String, index=True)
    message = Column(String)

class Actions(Base):
    __tablename__ = "actions"

    id = Column(Integer, primary_key=True, index=True)
    user = Column(String, index=True)
    action = Column(String, index=True)
    date = Column(String, index=True)
    time = Column(String, index=True)
