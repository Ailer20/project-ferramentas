
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const password2 = document.getElementById("password2").value;
    const messageDiv = document.getElementById("message");

    if (password !== password2) {
        messageDiv.textContent = "Passwords do not match.";
        messageDiv.style.color = "red";
        return;
    }

    try {
        const response = await fetch("/api/users/register/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.textContent = "Registration successful! You can now log in.";
            messageDiv.style.color = "green";
            window.location.href = "/login"; // Redirecionar para a página de login
        } else {
            messageDiv.textContent = data.username || data.email || data.password || data.detail || "Registration failed.";
            messageDiv.style.color = "red";
        }
    } catch (error) {
        messageDiv.textContent = "An error occurred: " + error.message;
        messageDiv.style.color = "red";
    }
});

