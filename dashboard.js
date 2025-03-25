// Configuração da API
const API_BASE_URL = 'https://smartpark-d07n.onrender.com';

// Função para obter o token do localStorage
function getToken() {
    return localStorage.getItem('smartpark_token');
}

// Função para verificar se o usuário está autenticado
function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
    }
    return token;
}

// Função para formatar data para YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Função para formatar valor em reais
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Função para formatar tempo
function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
}

// Função para buscar dados do dashboard
async function fetchDashboardData() {
    const token = checkAuth();
    
    try {
        // Obter datas do formulário
        const dataInicial = document.getElementById('dataInicial').value;
        const dataFinal = document.getElementById('dataFinal').value;

        console.log('Buscando dados para o período:', { dataInicial, dataFinal });

        // Buscar dados de faturamento por período
        const faturamentoUrl = `${API_BASE_URL}/admin/faturamento?data_inicial=${formatDate(dataInicial)}&data_final=${formatDate(dataFinal)}`;
        console.log('URL de faturamento:', faturamentoUrl);

        const faturamentoResponse = await fetch(faturamentoUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!faturamentoResponse.ok) {
            const errorText = await faturamentoResponse.text();
            console.error('Erro na resposta de faturamento:', {
                status: faturamentoResponse.status,
                statusText: faturamentoResponse.statusText,
                error: errorText
            });
            throw new Error(`Erro ao buscar dados de faturamento: ${faturamentoResponse.status} - ${errorText}`);
        }

        const faturamentoData = await faturamentoResponse.json();
        console.log('Dados de faturamento:', faturamentoData);

        // Atualizar cards com dados do faturamento
        document.getElementById('faturamento').textContent = formatCurrency(faturamentoData.faturamento_total || 0);
        document.getElementById('totalVeiculos').textContent = faturamentoData.quantidade_veiculos || 0;
        document.getElementById('tempoMedio').textContent = formatTime(Math.round((faturamentoData.ticket_medio || 0) * 60));
        document.getElementById('ticketMedio').textContent = formatCurrency(faturamentoData.ticket_medio || 0);

        // Buscar dados de fluxo por período
        const fluxoUrl = `${API_BASE_URL}/admin/fluxo/periodo?data_inicial=${formatDate(dataInicial)}&data_final=${formatDate(dataFinal)}`;
        console.log('URL de fluxo:', fluxoUrl);

        const fluxoResponse = await fetch(fluxoUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!fluxoResponse.ok) {
            const errorText = await fluxoResponse.text();
            console.error('Erro na resposta de fluxo:', {
                status: fluxoResponse.status,
                statusText: fluxoResponse.statusText,
                error: errorText
            });
            throw new Error(`Erro ao buscar dados de fluxo: ${fluxoResponse.status} - ${errorText}`);
        }

        const fluxoData = await fluxoResponse.json();
        console.log('Dados de fluxo:', fluxoData);

        // Atualizar gráfico de fluxo
        updateFluxoChart(fluxoData);

        // Buscar veículos recorrentes
        const veiculosUrl = `${API_BASE_URL}/admin/veiculos/recorrentes?data_inicial=${formatDate(dataInicial)}&data_final=${formatDate(dataFinal)}`;
        console.log('URL de veículos recorrentes:', veiculosUrl);

        const veiculosResponse = await fetch(veiculosUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!veiculosResponse.ok) {
            const errorText = await veiculosResponse.text();
            console.error('Erro na resposta de veículos:', {
                status: veiculosResponse.status,
                statusText: veiculosResponse.statusText,
                error: errorText
            });
            throw new Error(`Erro ao buscar veículos recorrentes: ${veiculosResponse.status} - ${errorText}`);
        }

        const veiculosData = await veiculosResponse.json();
        console.log('Dados de veículos recorrentes:', veiculosData);

        // Atualizar tabela de veículos recorrentes
        updateVeiculosRecorrentes(veiculosData);

    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        alert('Erro ao carregar dados do dashboard: ' + error.message);
    }
}

// Função para atualizar o gráfico de fluxo
function updateFluxoChart(data) {
    const canvas = document.getElementById('fluxoGrafico');
    if (!canvas) {
        console.error('Canvas do gráfico não encontrado');
        return;
    }

    const ctx = canvas.getContext('2d');
    
    // Destruir gráfico existente se houver
    if (window.fluxoChart) {
        window.fluxoChart.destroy();
    }

    window.fluxoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item.data),
            datasets: [{
                label: 'Entradas',
                data: data.map(item => item.entradas),
                borderColor: '#123524',
                backgroundColor: 'rgba(18, 53, 36, 0.1)',
                tension: 0.4
            }, {
                label: 'Saídas',
                data: data.map(item => item.saidas),
                borderColor: '#1e5438',
                backgroundColor: 'rgba(30, 84, 56, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Função para atualizar a tabela de veículos recorrentes
function updateVeiculosRecorrentes(data) {
    const tbody = document.getElementById('veiculosRecorrentesBody');
    if (!tbody) {
        console.error('Tabela de veículos recorrentes não encontrada');
        return;
    }

    tbody.innerHTML = data.map(veiculo => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${veiculo.placa}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${veiculo.quantidade_visitas}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(veiculo.valor_total)}</td>
        </tr>
    `).join('');
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando dashboard...');
    
    // Verificar autenticação
    checkAuth();

    // Configurar data inicial e final para últimos 7 dias por padrão
    const hoje = new Date();
    const semanaAtras = new Date(hoje);
    semanaAtras.setDate(hoje.getDate() - 7);

    const dataInicialInput = document.getElementById('dataInicial');
    const dataFinalInput = document.getElementById('dataFinal');
    
    if (dataInicialInput && dataFinalInput) {
        dataInicialInput.value = formatDate(semanaAtras);
        dataFinalInput.value = formatDate(hoje);
    }

    // Adicionar evento ao botão de busca
    const buscarBtn = document.getElementById('buscarDados');
    if (buscarBtn) {
        console.log('Configurando evento do botão de busca');
        buscarBtn.addEventListener('click', () => {
            console.log('Botão de busca clicado');
            fetchDashboardData();
        });
    } else {
        console.error('Botão de busca não encontrado!');
    }

    // Configurar botão de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('smartpark_token');
            window.location.href = '/login.html';
        });
    }

    // Carregar dados iniciais
    console.log('Carregando dados iniciais...');
    fetchDashboardData();
}); 