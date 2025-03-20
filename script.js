// Configuração da API
const API_BASE_URL = 'http://127.0.0.1:8000';

// Chave base para armazenar o log no localStorage
const LOG_STORAGE_KEY = 'operations_log';
const LOG_TIMESTAMP_KEY = 'operations_log_timestamp';

// Função para obter o token do localStorage
function getToken() {
    return localStorage.getItem('smartpark_token');
}

// Função para obter o ID do usuário do token
function getUserId() {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub; // ou payload.user_id, dependendo de como está estruturado seu token
    } catch (error) {
        console.error('Erro ao obter ID do usuário:', error);
        return null;
    }
}

// Função para obter as chaves de armazenamento específicas do usuário
function getUserStorageKeys() {
    const userId = getUserId();
    return {
        log: `${LOG_STORAGE_KEY}_${userId}`,
        timestamp: `${LOG_TIMESTAMP_KEY}_${userId}`
    };
}

// Função para verificar se o usuário está autenticado
function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
    }
    return token;
}

// Função para mostrar o modal de resultado
function showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('resultModal').classList.remove('hidden');
}

// Função para formatar o tempo
function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
}

// Função para formatar valor em reais
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Função para verificar se o usuário é admin
function isAdmin() {
    const token = getToken();
    if (!token) return false;
    try {
        // Decodifica o token JWT (assume que a parte payload está na segunda parte do token)
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.is_admin === true;
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        return false;
    }
}

// Função para carregar o log de operações
function loadOperationsLog() {
    const logElement = document.getElementById('operationsLog');
    if (!logElement) return;

    const userId = getUserId();
    if (!userId) {
        logElement.innerHTML = '<p class="text-gray-500 text-center italic">Erro ao carregar operações</p>';
        return;
    }

    const { log: logKey, timestamp: timestampKey } = getUserStorageKeys();

    // Verifica se precisa resetar o log (24h)
    const lastTimestamp = localStorage.getItem(timestampKey);
    const now = new Date().getTime();
    if (lastTimestamp && (now - parseInt(lastTimestamp)) > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(logKey);
        localStorage.removeItem(timestampKey);
    }

    // Carrega o log do localStorage
    const log = JSON.parse(localStorage.getItem(logKey) || '[]');
    
    if (log.length === 0) {
        logElement.innerHTML = '<p class="text-gray-500 text-center italic">Nenhuma operação registrada nas últimas 24 horas</p>';
        return;
    }

    // Renderiza os logs
    logElement.innerHTML = log.map(entry => `
        <div class="p-3 ${entry.tipo === 'entrada' ? 'bg-green-50' : 'bg-red-50'} rounded-lg">
            <div class="flex justify-between items-center">
                <span class="font-semibold ${entry.tipo === 'entrada' ? 'text-green-700' : 'text-red-700'}">
                    ${entry.tipo === 'entrada' ? '🚗 Entrada' : '🚙 Saída'}
                </span>
                <span class="text-sm text-gray-500">${entry.horario}</span>
            </div>
            <p class="text-gray-700">Placa: ${entry.placa}</p>
            ${entry.tipo === 'saida' ? `
                <p class="text-gray-700">Tempo: ${entry.tempo || 'N/A'}</p>
                <p class="text-gray-700">Valor: ${entry.valor || 'N/A'}</p>
            ` : ''}
        </div>
    `).join('');
}

// Função para adicionar uma nova entrada no log
function addToOperationsLog(data, tipo) {
    const userId = getUserId();
    if (!userId) return;

    const { log: logKey, timestamp: timestampKey } = getUserStorageKeys();
    const now = new Date();
    const entry = {
        tipo: tipo,
        placa: data.placa,
        horario: now.toLocaleTimeString(),
        timestamp: now.getTime()
    };

    if (tipo === 'saida') {
        entry.tempo = data.tempo_estacionado;
        entry.valor = formatCurrency(data.valor_devido);
    }

    // Carrega o log existente
    const log = JSON.parse(localStorage.getItem(logKey) || '[]');
    
    // Adiciona a nova entrada no início do array
    log.unshift(entry);

    // Salva o log atualizado
    localStorage.setItem(logKey, JSON.stringify(log));
    localStorage.setItem(timestampKey, now.getTime().toString());

    // Atualiza a exibição
    loadOperationsLog();
}

// Classe para gerenciar a captura de imagens
class ImageCapture {
    constructor(tipo) {
        this.tipo = tipo; // 'Entrada' ou 'Saida'
        this.stream = null;
        this.imageData = null;

        // Elementos
        this.video = document.getElementById(`video${tipo}`);
        this.preview = document.getElementById(`preview${tipo}`);
        this.placeholder = document.getElementById(`placeholder${tipo}`);
        this.fileInput = document.getElementById(`file${tipo}`);
        this.cameraButton = document.getElementById(`camera${tipo}`);
        this.captureButton = document.getElementById(`capturar${tipo}`);
        this.sendButton = document.getElementById(`enviar${tipo}`);

        // Event Listeners
        this.fileInput.addEventListener('change', () => this.handleFileSelect());
        this.cameraButton.addEventListener('click', () => this.toggleCamera());
        this.captureButton.addEventListener('click', () => this.captureImage());
        this.sendButton.addEventListener('click', () => this.sendImage());
    }

    // Manipular seleção de arquivo
    async handleFileSelect() {
        const file = this.fileInput.files[0];
        if (file) {
            this.imageData = file;
            this.preview.src = URL.createObjectURL(file);
            this.showPreview();
        }
    }

    // Alternar câmera
    async toggleCamera() {
        if (this.stream) {
            this.stopCamera();
        } else {
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
                this.video.srcObject = this.stream;
                this.video.classList.remove('hidden');
                this.preview.classList.add('hidden');
                this.placeholder.classList.add('hidden');
                this.captureButton.classList.remove('hidden');
                this.cameraButton.textContent = 'Parar';
            } catch (error) {
                console.error('Erro ao acessar câmera:', error);
                showModal('Erro', 'Não foi possível acessar a câmera. Verifique as permissões.');
            }
        }
    }

    // Parar câmera
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.video.classList.add('hidden');
            this.captureButton.classList.add('hidden');
            this.cameraButton.textContent = 'Câmera';
            if (!this.imageData) {
                this.placeholder.classList.remove('hidden');
            } else {
                this.preview.classList.remove('hidden');
            }
        }
    }

    // Capturar imagem
    captureImage() {
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        canvas.getContext('2d').drawImage(this.video, 0, 0);
        
        canvas.toBlob((blob) => {
            this.imageData = new File([blob], `captura_${Date.now()}.jpg`, { type: 'image/jpeg' });
            this.preview.src = URL.createObjectURL(blob);
            this.showPreview();
            this.stopCamera();
        }, 'image/jpeg');
    }

    // Mostrar preview
    showPreview() {
        this.video.classList.add('hidden');
        this.preview.classList.remove('hidden');
        this.placeholder.classList.add('hidden');
    }

    // Enviar imagem
    async sendImage() {
        if (!this.imageData) {
            showModal('Erro', 'Por favor, selecione ou capture uma imagem primeiro.');
            return;
        }

        // Mostrar loading
        this.sendButton.disabled = true;
        const originalText = this.sendButton.textContent;
        this.sendButton.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processando...
        `;

        const token = checkAuth();
        console.log('Token de autenticação:', token ? 'Presente' : 'Ausente');

        const formData = new FormData();
        formData.append('imagem', this.imageData);

        try {
            const endpoint = this.tipo === 'Entrada' ? '/estacionamento/entrada-distant' : '/estacionamento/saida-distant';
            console.log('Enviando requisição para:', `${API_BASE_URL}${endpoint}`);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            console.log('Resposta da API:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            const data = await response.json();
            console.log('Dados recebidos da API:', data);

            if (!response.ok) {
                throw new Error(data.detail || 'Erro ao processar requisição');
            }

            // Adiciona a operação ao log
            addToOperationsLog(data, this.tipo.toLowerCase());

            // Mostrar resultado com a placa correta do objeto data
            if (this.tipo === 'Entrada') {
                showModal('Entrada Registrada', `
                    <p class="mb-2">Placa identificada: <strong>${data.placa}</strong></p>
                    <p>Entrada registrada com sucesso!</p>
                `);
            } else {
                showModal('Saída Registrada', `
                    <p class="mb-2">Placa identificada: <strong>${data.placa}</strong></p>
                    <p class="mb-2">Tempo estacionado: <strong>${data.tempo_estacionado || '0min'}</strong></p>
                    <p>Valor a pagar: <strong>${formatCurrency(data.valor_devido || 0)}</strong></p>
                `);
            }

            // Limpar imagem
            this.imageData = null;
            this.preview.src = '';
            this.preview.classList.add('hidden');
            this.placeholder.classList.remove('hidden');
            this.fileInput.value = '';

            // Atualizar dashboard
            updateDashboard();
        } catch (error) {
            console.error('Erro detalhado ao enviar imagem:', {
                message: error.message,
                error: error
            });
            showModal('Erro', error.message || 'Erro ao processar a imagem');
        } finally {
            // Restaurar botão
            this.sendButton.disabled = false;
            this.sendButton.innerHTML = originalText;
        }
    }
}

// Função para atualizar os dados do dashboard
async function updateDashboard() {
    const token = checkAuth();
    
    // Se não for admin, oculta a seção de estatísticas
    const statsSection = document.querySelector('.stats-section');
    if (!isAdmin()) {
        if (statsSection) {
            statsSection.classList.add('hidden');
        }
        return;
    }

    // Se for admin, mostra e atualiza as estatísticas
    if (statsSection) {
        statsSection.classList.remove('hidden');
    }
    
    try {
        // Aqui você vai adicionar as chamadas para sua API
        // Por enquanto, vamos apenas simular alguns dados
        const occupancy = 75;
        const availableSpots = 25;
        const vehiclesToday = 150;

        // Atualiza os elementos na interface
        document.getElementById('occupancy').textContent = occupancy;
        document.getElementById('available-spots').textContent = availableSpots;
        document.getElementById('vehicles-today').textContent = vehiclesToday;
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        if (error.status === 401) {
            window.location.href = '/login.html';
        }
    }
}

// Função para atualizar a visibilidade do botão de dashboard
function updateDashboardButton() {
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) {
        if (isAdmin()) {
            dashboardBtn.classList.remove('hidden');
            dashboardBtn.addEventListener('click', () => {
                window.location.href = '/dashboard.html';
            });
        } else {
            dashboardBtn.classList.add('hidden');
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Verifica autenticação
    checkAuth();

    // Inicializa os gerenciadores de captura de imagem
    const entradaCapture = new ImageCapture('Entrada');
    const saidaCapture = new ImageCapture('Saida');

    // Configura o botão de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('smartpark_token');
            window.location.href = '/login.html';
        });
    }

    // Atualiza a visibilidade do botão de dashboard
    updateDashboardButton();

    // Atualiza o dashboard inicialmente
    updateDashboard();

    // Atualiza o dashboard a cada 30 segundos
    setInterval(updateDashboard, 30000);

    // Carrega o log de operações
    loadOperationsLog();
}); 