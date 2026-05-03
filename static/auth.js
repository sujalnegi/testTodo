// API Endpoints
const LOGIN_URL = '/api/login';
const REGISTER_URL = '/api/register';

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const submitBtn = document.getElementById('submit-btn');
    const toggleLink = document.getElementById('toggle-link');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    let isLoginMode = true;

    // Toggle between Login and Register
    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;

        if (isLoginMode) {
            submitBtn.textContent = 'Login';
            toggleLink.textContent = "Don't have an account? Register";
            confirmPasswordInput.classList.add('hidden');
            confirmPasswordInput.required = false;
        } else {
            submitBtn.textContent = 'Register';
            toggleLink.textContent = "Already have one? Login";
            confirmPasswordInput.classList.remove('hidden');
            confirmPasswordInput.required = true;
        }
        
        // Clear inputs on toggle
        authForm.reset();
    });

    // Handle form submission
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!isLoginMode) {
            const confirmPassword = confirmPasswordInput.value;
            if (password !== confirmPassword) {
                alert("Passwords do not match");
                return;
            }
        }

        const url = isLoginMode ? LOGIN_URL : REGISTER_URL;
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            
            if (response.ok && data.success) {
                if (isLoginMode) {
                    window.location.href = '/app.html';
                } else {
                    alert("Registration successful! Please login.");
                    toggleLink.click();
                }
            } else {
                alert(data.error || "Authentication failed");
            }
        } catch (error) {
            console.error('Auth error:', error);
            alert("An error occurred during authentication.");
        } finally {
            submitBtn.disabled = false;
        }
    });
});
