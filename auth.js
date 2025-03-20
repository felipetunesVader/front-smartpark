const API_BASE_URL = 'http://127.0.0.1:8000';

// Função para mostrar mensagens de erro ou sucesso
function showMessage(message, isError = false) {
    // Remove qualquer mensagem existente
    const existingMessage = document.querySelector('.message-alert');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Cria o elemento de mensagem
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-alert fixed top-4 right-4 p-4 rounded-lg ${
        isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
    }`;
    messageDiv.textContent = message;

    // Adiciona ao corpo do documento
    document.body.appendChild(messageDiv);

    // Remove após 5 segundos
    setTimeout(() => messageDiv.remove(), 5000);
}

// Função para salvar o token no localStorage
function saveToken(token) {
    localStorage.setItem('smartpark_token', token);
}

// Função para obter o token do localStorage
function getToken() {
    return localStorage.getItem('smartpark_token');
}

// Função para fazer logout
function logout() {
    localStorage.removeItem('smartpark_token');
    window.location.href = '/login.html';
}

// Função para verificar se o usuário está autenticado
function checkAuth() {
    const token = getToken();
    if (!token && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('registro.html')) {
        window.location.href = '/login.html';
    }
}

// Handler do formulário de login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        formData.append('grant_type', 'password');
        formData.append('scope', '');
        formData.append('client_id', 'string');
        formData.append('client_secret', 'string');

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            mode: 'cors',
            body: formData.toString()
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao fazer login');
        }

        const data = await response.json();
        saveToken(data.access_token);
        showMessage('Login realizado com sucesso!');
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Erro no login:', error);
        showMessage(error.message || 'Erro ao fazer login', true);
    }
}

// Handler do formulário de registro
async function handleRegister(e) {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('password').value;

    try {
        console.log('Iniciando registro com dados:', { email, nome });

        const response = await fetch(`${API_BASE_URL}/auth/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify({
                email: email,
                nome: nome,
                senha: senha
            })
        });

        console.log('Resposta do servidor:', response.status);

        // Se o status for 200 ou 201, consideramos sucesso mesmo que não consiga ler o body
        if (response.status === 200 || response.status === 201) {
            showMessage('Registro realizado com sucesso!');
            
            // Aguarda 1 segundo antes de redirecionar
            setTimeout(() => {
                try {
                    window.location.href = '/login.html';
                } catch (error) {
                    console.error('Erro ao redirecionar:', error);
                    // Se falhar o redirecionamento, tenta recarregar a página
                    window.location.reload();
                }
            }, 1000);
            return;
        }

        // Se não for sucesso, tenta ler o erro
        try {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao registrar usuário');
        } catch (jsonError) {
            throw new Error('Erro ao registrar usuário');
        }

    } catch (error) {
        console.error('Erro detalhado no registro:', error);
        showMessage(error.message || 'Erro ao registrar usuário', true);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Verifica autenticação em todas as páginas
    checkAuth();

    // Adiciona handlers aos formulários
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Atualiza o botão de login na página principal
    const loginButton = document.querySelector('button:contains("Login")');
    if (loginButton && getToken()) {
        loginButton.textContent = 'Logout';
        loginButton.addEventListener('click', logout);
    }
}); 