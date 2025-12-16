// HTTP requests:
async function getAllUsers(token){
    const response = await fetch('http://localhost:8000/get_all_users', {
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
    return data;
}

async function getUsersMessages(token, query){
    const response = await fetch(`http://localhost:8000/get_users_messages?from_user=${query[0]}&to_user=${query[1]}`, {
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
    return data;
}

async function getUserActions(token, query){
    const response = await fetch(`http://localhost:8000/get_users_actions?username=${query}`, {
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
    return data;
}

//Define functions:
function createTable(id, rows, columns, data, parentContainer) {
    if (data.length !== rows || Object.keys(data[0]).length !== columns) {
        return console.log(
            `Error: expected ${rows} rows and ${columns} columns, instead received ${data.length} rows and ${Object.keys(data[0]).length} columns`
        );
    }

    // Create scroll wrapper
    const scrollWrapper = document.createElement('div');
    scrollWrapper.classList.add('table-scroll-wrapper');

    // Create the table
    const newTable = document.createElement('table');
    newTable.id = `table${id}`;
    newTable.classList.add('admin-table');

    // Create header row
    const headerRow = document.createElement('tr');
    headerRow.id = `table${id}HeaderRow`;
    for (let key of Object.keys(data[0])) {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    }
    newTable.appendChild(headerRow);

    // Create data rows
    for (let i = 0; i < rows; i++) {
        const newRow = document.createElement('tr');
        newRow.id = `table${id}Row${i}`;

        for (let value of Object.values(data[i])) {
            const td = document.createElement('td');
            td.textContent = value;
            td.classList.add('cell-wrap'); // Add class for wrapping
            newRow.appendChild(td);
        }

        newTable.appendChild(newRow);
    }

    // Add table to scroll wrapper
    scrollWrapper.appendChild(newTable);

    // Append to parent container
    const container = document.querySelector(`.${parentContainer}`);
    if (container) {
        container.appendChild(scrollWrapper);
    } else {
        console.log(`Error: parent container .${parentContainer} not found`);
    }
}
//Main code:
let adminTerminal = document.querySelector('.adminTerminal')
let usersListBtn = document.getElementById('usersList')
let usersMessagesBtn = document.getElementById('usersMsgs')
let userActionsBtn = document.getElementById('usersActns')

usersListBtn.addEventListener('click', function () {
    getAllUsers(sessionStorage.getItem('accessToken'))
        .then(users => {
            // Check for valid data
            if (users.length === 0) {
                console.log("No users returned");
                return;
            }else{
                document.querySelector('.adminTerminal').innerHTML = ''
            }

            // Get number of columns from keys of first object
            const columns = Object.keys(users[0]).length;
            
            createTable(0, users.length, columns, users, 'adminTerminal');
        })
        .catch(err => {
            console.log(`Error: ${err}`);
        });
});

usersMessagesBtn.addEventListener('click', function(){
    let adminTerminal = document.querySelector('.adminTerminal')
    let query = new Array()

    if(adminTerminal){
        adminTerminal.innerHTML = ''
    }
    let functionBtns = document.createElement('div')
    let fromUserInput = document.createElement('input')
    let toUserInput = document.createElement('input')
    let getBtn = document.createElement('button')

    functionBtns.style.cssText = `
        width: 900 px;
        height: 40px;
        margin-left: 5px;
        margin-top: 5px;
        display: flex:
        justify-content: space-evenly;
        align-items: center;
    `
    fromUserInput.style.width = '300px'
    fromUserInput.placeholder = 'From user'
    fromUserInput.style.marginRight = '5px'

    toUserInput.style.width = '300px'
    toUserInput.placeholder = 'To user'
    toUserInput.style.marginRight = '5px'

    getBtn.style.widht = '300px'
    getBtn.style.height = '20px'
    getBtn.innerHTML = 'Get messages'

    getBtn.addEventListener('click', function(){
        query.push(fromUserInput.value)
        query.push(toUserInput.value)

        fromUserInput.value = ''
        toUserInput.value = ''

        getUsersMessages(sessionStorage.getItem('accessToken'), query)
        .then(messages => {
            query = new Array()
            if (document.getElementById('table0')) {
                document.getElementById('table0').remove();
            }

            // Get number of columns from keys of first object
            const columns = Object.keys(messages[0]).length;

            // Pass the array of objects directly
            createTable(0, messages.length, columns, messages, 'adminTerminal');
            })
        .catch(error => {
            console.log(error)
            if (document.getElementById('table0')) {
                document.getElementById('table0').remove();
            }
            let response = document.createElement('span')
            response.id = 'table0'
            response.innerHTML = `${error}`
            response.style.marginLeft = '5px'
            adminTerminal.append(response)
            query = new Array()
        })
    })
    
    adminTerminal.append(functionBtns)
    functionBtns.append(fromUserInput)
    functionBtns.append(toUserInput)
    functionBtns.append(getBtn)


})

userActionsBtn.addEventListener('click', function(){
    let adminTerminal = document.querySelector('.adminTerminal')
    let query

    if(adminTerminal){
        adminTerminal.innerHTML = ''
    }
    let functionBtns = document.createElement('div')
    let userInput = document.createElement('input')
    let getBtn = document.createElement('button')

    functionBtns.style.cssText = `
        width: 900 px;
        height: 40px;
        margin-left: 5px;
        margin-top: 5px;
        display: flex:
        justify-content: space-evenly;
        align-items: center;
    `
    userInput.style.width = '300px'
    userInput.placeholder = 'From user'
    userInput.style.marginRight = '5px'

    getBtn.style.widht = '300px'
    getBtn.style.height = '20px'
    getBtn.innerHTML = 'Get actions'

    getBtn.addEventListener('click', function(){
        query = userInput.value

        userInput.value = ''

        getUserActions(sessionStorage.getItem('accessToken'), query)
        .then(messages => {
            query = null
            if (document.getElementById('table0')) {
                document.getElementById('table0').remove();
            }

            // Get number of columns from keys of first object
            const columns = Object.keys(messages[0]).length;

            // Pass the array of objects directly
            createTable(0, messages.length, columns, messages, 'adminTerminal');
            })
        .catch(error => {
            console.log(error)
            if (document.getElementById('table0')) {
                document.getElementById('table0').remove();
            }
            let response = document.createElement('span')
            response.id = 'table0'
            response.innerHTML = `${error}`
            response.style.marginLeft = '5px'
            adminTerminal.append(response)
            query = new Array()
        })
    })
    
    adminTerminal.append(functionBtns)
    functionBtns.append(userInput)
    functionBtns.append(getBtn)
})