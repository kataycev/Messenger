// Define functions
async function currentUser(token) {

    const response = await fetch('http://localhost:8000/me', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error');
    }

    const data = await response.json();
    console.log("User", data);
    return data.username;
}

async function searchUsers(token, query) {

    const response = await fetch(`http://localhost:8000/search_users?query=${query}`, {
        method: "GET",
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    })

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error');
    }

    const data = await response.json();
    console.log('Users:', data)
    return data;
}

const chatsWS = new WebSocket(`ws://localhost:8000/ws/chats?token=${sessionStorage.getItem('accessToken')}`)
let chatWS

// Define custom elements
class RecievedMessage extends HTMLElement {

    render(){
        this.innerHTML = `<span style='font-weight: bold'>${this.id}</span><span>${this.getAttribute("msg")}</span>`
    }

    connectedCallback() {
        if (!this.rendered) {
        this.render();
        this.getStyles;
        this.rendered = true;
        }
    }

    static get observedAttributes() {
        return ['msg'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        this.render();
    }

    get getStyles() {
        this.style.cssText = `
            width: 100%;
            height: 50px;

            padding: 0px 0px 0px 10px;

            display: flex;
            flex-direction: column;
            justify-content: space-evenly;
            align-items: flex-start;

            background-color: rgba(216, 216, 216, 216);
        `
        this.addEventListener('mouseover', function(){
            this.style.backgroundColor = 'rgba(135, 135, 135, 135)'
        })
        this.addEventListener('mouseout', function(){
            this.style.backgroundColor = 'rgba(216, 216, 216, 216)'
        })
    }

}

class MessageDiv extends HTMLElement {
    connectedCallback(){
        this.getStyles
    }

    get getStyles() {
        this.style.cssText = `
            width: 1000px;
            height: 30px;

            display: flex;
            flex-direction: column;
            justify-content: space-evenly;
            align-items: flex-start;

        `
    }
}

class SearchUsers extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const serachUserInput = document.createElement('input')
        const closeSeacrhBtn = document.createElement('img')

        serachUserInput.id = 'serachUserInput'
        serachUserInput.placeholder = 'Search'
        this.append(serachUserInput)

        closeSeacrhBtn.id = 'closeSeacrhBtn'
        closeSeacrhBtn.src = `${this.getAttribute('src')}`
        closeSeacrhBtn.alt = 'closeBtn'
        this.append(closeSeacrhBtn)

        this.getStyles
        this.inputEventListener
        this.closeBtnEventListener
        this.searchUser
    }

    get getStyles(){

        this.style.cssText = `
            width: 245px;
            height: 30px;
            display: flex;
            justify-content: space-evenly;
            align-items: center;
            background-color: white;
        `

        document.getElementById('serachUserInput').style.cssText = `
            width: 200px;
            height: 24px;
            border: none;
        `  
    }

    get inputEventListener(){
        let serachUsersInput = document.getElementById('serachUserInput')
        let searchUsers = this

        serachUsersInput.addEventListener('click', function(){
            let searchResult = document.getElementById('searchResult')
            let messages = document.querySelector('.recievedMessages')

            messages.style.visibility = 'hidden'

            if(!searchResult){
                let searchResult = document.createElement("div")
                searchResult.id = 'searchResult'
                searchResult.style.marginTop = '10px'
                searchResult.innerHTML = 'Search result will appear here'
                searchUsers.parentNode.insertBefore(searchResult, messages)
            }

        })

    }

    get closeBtnEventListener(){
        let closeSeacrhBtn = document.getElementById('closeSeacrhBtn')
        closeSeacrhBtn.addEventListener('click', function(){
            let messages = document.querySelector('.recievedMessages')
            let searchResult = document.getElementById('searchResult')

            if(searchResult){
                searchResult.remove()
            }

            messages.style.visibility = 'visible'
        })
    }

    get searchUser(){
        let serachUserInput = document.getElementById('serachUserInput')
        serachUserInput.addEventListener('keyup', function(){
            if (event.key === 'Enter') {
                event.preventDefault();
                if(serachUserInput.value){
                    let searchResult = document.getElementById('searchResult')
                    searchUsers(sessionStorage.getItem('accessToken'), serachUserInput.value)
                    .then((users)=>{
                        serachUserInput.value = ''
                        searchResult.innerHTML = ''
                        for(let user of users) {
                            let newUser = document.createElement('div')
                            newUser.id = `${user['username']}`
                            newUser.style.cssText = `
                            width: 245px;
                            height: 30px;
                            padding: 0px 0px 0px 10px;
                            display: flex;
                            justify-content: flex-start;
                            align-items: center;
                            color: rgb(42, 42, 42, 42);
                            font-weight: bold;
                            `
                            newUser.innerHTML = `${user['username']}`
                            newUser.addEventListener('mouseover', function(){
                                newUser.style.backgroundColor = 'rgba(135, 135, 135, 135)'
                            })
                            newUser.addEventListener('mouseout', function(){
                                newUser.style.backgroundColor = 'rgba(216, 216, 216, 216)'
                            })
                            newUser.addEventListener('click', function(){
                                let scrollMessages = document.querySelector('.scrollMessages')
                                if(scrollMessages){
                                    scrollMessages.remove()
                                    chatWS.close(1000, "Work complete")
                                }
                                chatWS = new WebSocket(`ws://localhost:8000/ws/chat/${user['username']}?token=${sessionStorage.getItem('accessToken')}`)
                                chatWS.onopen = function(e){

                                    console.log("[open] Connection established");
                                    console.log("Sending to server");
                                    scrollMessages = document.createElement('div')
                                    scrollMessages.className = 'scrollMessages'
                                    scrollMessages.id = `${user['username']}`
                                    scrollMessages.style.cssText = `
                                        width: 910px;
                                        display: flex;
                                        justify-content: flex-end;
                                        flex-direction: column;
                                    `
                                    document.querySelector('.displayer').append(scrollMessages)
                                };

                                chatWS.onclose = function(event) {
                                    if (event.wasClean) {
                                        console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
                                    } else {
                                        // e.g. server process killed or network down
                                        // event.code is usually 1006 in this case
                                        console.log('[close] Connection died');
                                    }
                                };

                                chatWS.onmessage = function(event){
                                    for(let message of JSON.parse(event.data)){
                                        let newMessage = document.createElement('div')
                                        newMessage.innerHTML = `${message.message}`
                                        newMessage.id =`${message.from_user}`
                                        newMessage.style.width = '300px'
                                        newMessage.style.backgroundColor = 'rgba(216, 216, 216, 216)'
                                        newMessage.style.padding = '10px'
                                        newMessage.style.borderRadius = '5px'
                                        newMessage.style.marginTop = '5px'
                                        newMessage.style.overflowWrap = 'break-word'
                                        if(user['username'] === message.from_user){
                                            newMessage.style.alignSelf ='flex-start'
                                        }else{
                                            newMessage.style.alignSelf ='flex-end'
                                            newMessage.style.textAlign ='left'
                                        }
                                        document.querySelector('.scrollMessages').append(newMessage)
                                        
                                    }
                                    document.querySelector('.displayer').scrollTop =  document.querySelector('.displayer').scrollHeight
                                }
                            })
                            searchResult.append(newUser)
                        }
                    })
                    .catch(error => {
                        serachUserInput.value = ''
                        searchResult.innerHTML = ''
                        let errorMsg = document.createElement('span')
                        errorMsg.style.width = '250px'
                        errorMsg.style.height = '30px'
                        errorMsg.style.padding = '5px'
                        errorMsg.style.padding = '5px'
                        errorMsg.innerHTML = `${error}`
                        errorMsg.innerHTML = errorMsg.innerHTML.slice(7)
                        searchResult.append(errorMsg)
                    })
                }
            }
        })
    }

}

/* Define custom elements */

customElements.define("recieved-message", RecievedMessage);
customElements.define("search-user", SearchUsers);

//Initialize session
console.log(sessionStorage.getItem('accessToken'))

//Main code
let recievedMessages = document.querySelector('.recievedMessages')

let btn = document.getElementById('sendBtn')

btn.addEventListener('click', function(){
    let input = document.querySelector('.inputMsg')
    chatWS.send(input.value)
    input.value = ''
})

chatsWS.onopen = function(e){
    console.log("[open] Connection established");
    console.log("Sending to server");
};

chatsWS.onclose = function(event) {
  if (event.wasClean) {
    console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
  } else {
    // e.g. server process killed or network down
    // event.code is usually 1006 in this case
    console.log('[close] Connection died');
  }
};

chatsWS.onmessage = function(event) {
    let username = sessionStorage.getItem('Username')
    for(let user of JSON.parse(event.data)){
        if(user.from_user === username){
            user.from_user = user.to_user
            user.to_user = username
        }
        let existUser = document.querySelector(`.${user.from_user}`)
        if(existUser){
            existUser.setAttribute('msg', `${user.message.slice(0, 20)}...`)
        }else{
            console.log('Here')
            let newUser = document.createElement('recieved-message')
            newUser.id = `${user.from_user}`
            newUser.className = `${user.from_user}`
            newUser.setAttribute('msg', `${user.message.slice(0, 20)}...`)
            recievedMessages.prepend(newUser)
            newUser.addEventListener('click', function(){
                let scrollMessages = document.querySelector('.scrollMessages')
                let idClickedUser = this.id

                if(scrollMessages){
                    scrollMessages.remove()
                    chatWS.close(1000, "Work complete")
                }

                chatWS = new WebSocket(`ws://localhost:8000/ws/chat/${idClickedUser}?token=${sessionStorage.getItem('accessToken')}`)
                chatWS.onopen = function(e){
                    console.log("[open] Connection established");
                    console.log("Sending to server");
                    scrollMessages = document.createElement('div')
                    scrollMessages.className = 'scrollMessages'
                    scrollMessages.id = `${idClickedUser}`
                    scrollMessages.style.cssText = `
                        width: 910px;
                        display: flex;
                        justify-content: flex-end;
                        flex-direction: column;
                    `
                    document.querySelector('.displayer').append(scrollMessages)

                };

                chatWS.onclose = function(event) {
                    if (event.wasClean) {
                        console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
                    } else {
                        // e.g. server process killed or network down
                        // event.code is usually 1006 in this case
                        console.log('[close] Connection died');
                    }
                };

                chatWS.onmessage = function(event){
                    for(let message of JSON.parse(event.data)){
                        let newMessage = document.createElement('div')
                        newMessage.innerHTML = `${message.message}`
                        newMessage.id =`${message.from_user}`
                        newMessage.style.width = '300px'
                        newMessage.style.backgroundColor = 'rgba(216, 216, 216, 216)'
                        newMessage.style.padding = '10px'
                        newMessage.style.borderRadius = '5px'
                        newMessage.style.marginTop = '5px'
                        newMessage.style.overflowWrap = 'break-word'
                        if(idClickedUser === message.from_user){
                            newMessage.style.alignSelf ='flex-start'
                        }else{
                            newMessage.style.alignSelf ='flex-end'
                            newMessage.style.textAlign ='left'
                        }
                        document.querySelector('.scrollMessages').append(newMessage)
                        
                    }
                    document.querySelector('.displayer').scrollTop =  document.querySelector('.displayer').scrollHeight
                }



            })

        }
    }
}

