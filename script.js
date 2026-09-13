document.addEventListener("DOMContentLoaded", () => {
    // Pegamos os elementos do HTML onde vamos injetar os dados
    const nginxStatus = document.getElementById('nginx-status');
    const apiStatus = document.getElementById('api-status');
    const uptimeStr = document.getElementById('uptime');
    const ramStr = document.getElementById('ram');

    // Função que busca os dados da sua API
    async function updateStatus() {
        try {
            // Tenta se conectar à API real do seu S21+ passando pelo DuckDNS e NGINX
            const response = await fetch('https://homelabs21.duckdns.org/api/status');
            const data = await response.json();

            // Injeta os dados reais no HTML
            nginxStatus.textContent = data.services.nginx ? "Online" : "Offline";
            apiStatus.textContent = data.services.python ? "Online" : "Offline";
            uptimeStr.textContent = data.uptime;
            ramStr.textContent = data.ram + "%";

            // Muda a cor dependendo do status
            nginxStatus.style.color = data.services.nginx ? "#4CAF50" : "#ff5252";
            apiStatus.style.color = data.services.python ? "#4CAF50" : "#ff5252";

        } catch (error) {
            console.warn("Aviso: Testando localmente. Carregando dados simulados.");
            
            // Dados simulados para você visualizar enquanto desenvolve no Fedora
            nginxStatus.textContent = "Online (Dev)";
            apiStatus.textContent = "Online (Dev)";
            uptimeStr.textContent = "15 dias, 3h (Dev)";
            ramStr.textContent = "58.2%";
            
            nginxStatus.style.color = "#007ACC";
            apiStatus.style.color = "#007ACC";
        }
    }

    // Chama a função assim que o site carrega
    updateStatus();
    
    // Configura para atualizar os dados automaticamente a cada 30 segundos
    setInterval(updateStatus, 30000);
});