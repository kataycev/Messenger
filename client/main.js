/* Imports */

/* Classes */

// Classes for messages


/* Functions */

// Functions for server

async function registerUser(username, password) {
    const response = await fetch('http://localhost:8000/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            password
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
    }

    const data = await response.json();
    console.log("Registered successfully:", data);
    return data.access_token;
}

async function loginUser(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch('http://localhost:8000/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
    }

    const data = await response.json();
    console.log("Logged in successfully:", data);
    return data.access_token;
}

/* Sign up page */

let signUpBtn = document.getElementById('signUpBtn')

signUpBtn.addEventListener('click', function(){
    console.log('Hey')
    let login = document.getElementById('loginInputRp').value
    let password = document.getElementById('passwordRp').value

    registerUser(`${login}`, `${password}`)
    .then(token => {
        console.log("JWT Token after register:", token);
    })
    .catch(err => {
        console.error("Register error:", err.message);
    });
})

/* Log in page */

/* User page */

/* Admin page */