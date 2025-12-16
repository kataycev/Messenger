// Define functions

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

// Main code
let loginBtn = document.getElementById('logInBtn')

loginBtn.addEventListener('click', function(){
    let login = document.getElementById('loginInputLp')
    let password = document.getElementById('passwordInputLp')

    if(login.value === '' || password.value === ''){
        login.style.borderColor = 'red'
        password.style.borderColor = 'red'
    }else{
        login.style.borderColor = 'rgba(33, 180, 0, 1)'
        password.style.borderColor = 'rgba(33, 180, 0, 1)'
        loginUser(login.value, password.value)
        .then(token => {
            sessionStorage.setItem('accessToken', token)
            sessionStorage.setItem('Username', login.value)
            console.log("JWT Token after login:", token);
            if(login.value === 'admin'){
                window.location.pathname = 'D:/Master_degree/Semester_3/MPP/messenger/client/adminPage/adminPage.html'
            }else{
                window.location.pathname = 'D:/Master_degree/Semester_3/MPP/messenger/client/userPage/userPage.html'
            }
        })
        .catch(err => {
            console.error("Login error:", err.message);
            login.style.borderColor = 'red'
            password.style.borderColor = 'red'
        });
    }
})