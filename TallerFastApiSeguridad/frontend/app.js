const API_URL = 'http://127.0.0.1:8000'; // URL de tu backend FastAPI

// --- Lógica de enrutamiento simple ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    
    // Si estamos en la página de login
    if (document.getElementById('login-form')) {
        if (token) {
            window.location.href = 'dashboard.html'; // Si ya hay token, ir al dashboard
        }
        setupLoginForm();
    }

    // Si estamos en el dashboard
    if (document.getElementById('grades-list')) {
        if (!token) {
            window.location.href = 'index.html'; // Si no hay token, volver al login
            return;
        }
        setupDashboard();
    }
});

// --- Funciones para el Login ---/
function setupLoginForm() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');

        try {
            // FastAPI espera los datos del login como 'form data'
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch(`${API_URL}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Usuario o contraseña incorrectos.');
            }

            const data = await response.json();
            localStorage.setItem('accessToken', data.access_token);
            window.location.href = 'dashboard.html';

        } catch (error) {
            errorMessage.textContent = error.message;
        }
    });
}

// --- Funciones para el Dashboard ---
function setupDashboard() {
    fetchGrades(); // Cargar las notas al inicio
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        window.location.href = 'index.html';
    });

    const addGradeForm = document.getElementById('add-grade-form');
    addGradeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentName = document.getElementById('student-name').value;
        const subject = document.getElementById('subject').value;
        const score = parseFloat(document.getElementById('score').value);

        await addGrade(studentName, subject, score);
        addGradeForm.reset(); // Limpiar el formulario
        fetchGrades(); // Recargar la lista de notas
    });
}

async function fetchGrades() {
    const token = localStorage.getItem('accessToken');
    const gradesListDiv = document.getElementById('grades-list');
    
    try {
        const response = await fetch(`${API_URL}/grades/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) { // Token inválido o expirado
                localStorage.removeItem('accessToken');
                window.location.href = 'index.html';
            }
            throw new Error('No se pudieron cargar las calificaciones.');
        }

        const grades = await response.json();
        gradesListDiv.innerHTML = ''; // Limpiar la lista antes de volver a pintarla
        grades.forEach(grade => {
            const gradeElement = document.createElement('div');
            gradeElement.className = 'grade-item';
            gradeElement.innerHTML = `<strong>${grade.student_name}</strong> - ${grade.subject}: <span>${grade.score}</span>`;
            gradesListDiv.appendChild(gradeElement);
        });

    } catch (error) {
        gradesListDiv.innerHTML = `<p class="error">${error.message}</p>`;
    }
}

async function addGrade(student_name, subject, score) {
    const token = localStorage.getItem('accessToken');
    try {
        await fetch(`${API_URL}/grades/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ student_name, subject, score })
        });
    } catch (error) {
        alert('Error al añadir la calificación.');
    }
}