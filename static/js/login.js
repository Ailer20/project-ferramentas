import { refreshToken } from "./main.js";  // Caminho RELATIVO correto em módulos

console.log("login.js loaded.");

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    console.log("Form submission intercepted.");
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');

    try {
        const response = await fetch('/api/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('access_token', data.access);
            console.log('Access Token:', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            console.log('Refresh Token:', data.refresh);
            messageDiv.textContent = 'Login successful!';
            messageDiv.style.color = 'green';
            console.log('Redirecting to:', '/dashboard');
            window.location.replace('/dashboard'); // Redirecionar para o dashboard
        } else {
            messageDiv.textContent = data.detail || 'Login failed.';
            messageDiv.style.color = 'red';
        }
    } catch (error) {
        messageDiv.textContent = 'An error occurred: ' + error.message;
        messageDiv.style.color = 'red';
    }
});
