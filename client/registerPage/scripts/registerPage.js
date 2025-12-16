//Define functions
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

//Main code
let signUpBtn = document.getElementById('signUpBtn')

signUpBtn.addEventListener('click', function(){
    console.log('Btn sign up was clicked')
    let login = document.getElementById('loginInputRp').value
    let password = document.getElementById('passwordRp').value

    if(login === '' || password ==='' || password !== document.getElementById('passwordRpRep').value){
        document.getElementById('loginInputRp').style.borderColor = 'red'
        document.getElementById('passwordRp').style.borderColor = 'red'
        document.getElementById('passwordRpRep').style.borderColor = 'red'
    } else {
        document.getElementById('loginInputRp').style.borderColor = 'rgba(33, 180, 0, 1)'
        document.getElementById('passwordRp').style.borderColor = 'rgba(33, 180, 0, 1)'
        document.getElementById('passwordRpRep').style.borderColor = 'rgba(33, 180, 0, 1)'

        registerUser(`${login}`, `${password}`)
        .then(token => {
            console.log("JWT Token after register:", token);
            window.location.pathname = 'D:/Master_degree/Semester_3/MPP/messenger/client/signPage/signPage.html'
        })
        .catch(err => {
            console.error("Register error:", err.message);
            document.getElementById('loginInputRp').style.borderColor = 'red'
            document.getElementById('passwordRp').style.borderColor = 'red'
            document.getElementById('passwordRpRep').style.borderColor = 'red'
        });
        
    }
})