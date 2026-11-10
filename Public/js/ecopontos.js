
document.addEventListener("DOMContentLoaded", () => {

    // ======================================
    // ELEMENTOS DO HTML
    // ======================================

    const btnLocalizar = document.getElementById("btnLocalizar");
    const status = document.getElementById("statusEcopontos");
    const lista = document.getElementById("listaEcopontos");

    const statusModal = document.getElementById("statusModalEcopontos");
    const listaModal = document.getElementById("listaModalEcopontos");

    const modalElemento = document.getElementById("modalEcopontos");

    if (!btnLocalizar || !status || !lista) {
        console.error("Elementos dos ecopontos não encontrados.");
        return;
    }

    // ======================================
    // INICIALIZAR MAPA
    // ======================================

    const mapa = L.map("mapaEcopontos").setView([-15, -50], 4);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
    }).addTo(mapa);

    const marcadores = L.layerGroup().addTo(mapa);

    // ======================================
    // INICIALIZAR MODAL
    // ======================================

    const modal = modalElemento && window.bootstrap
        ? bootstrap.Modal.getOrCreateInstance(modalElemento)
        : null;

    // ======================================
    // CALCULAR DISTÂNCIA
    // ======================================

    function calcularDistancia(lat1, lon1, lat2, lon2) {

        const R = 6371;

        const rad = valor => valor * Math.PI / 180;

        const dLat = rad(lat2 - lat1);
        const dLon = rad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(rad(lat1)) *
            Math.cos(rad(lat2)) *
            Math.sin(dLon / 2) ** 2;

        return 2 * R * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );
    }

    // ======================================
    // FORMATAR DISTÂNCIA
    // ======================================

    function formatarDistancia(distancia) {

        if (distancia < 1) {
            return `${Math.round(distancia * 1000)} metros`;
        }

        return `${distancia.toFixed(2).replace(".", ",")} km`;
    }

    // ======================================
    // ATUALIZAR STATUS
    // ======================================

    function atualizarStatus(mensagem) {

        status.textContent = mensagem;

        if (statusModal) {
            statusModal.textContent = mensagem;
        }
    }

    // ======================================
    // LIMPAR RESULTADOS
    // ======================================

    function limparResultados() {

        lista.innerHTML = "";

        if (listaModal) {
            listaModal.innerHTML = "";
        }

        marcadores.clearLayers();
    }

    // ======================================
    // OBTER LOCALIZAÇÃO
    // ======================================

    function obterLocalizacao() {

        return new Promise((resolve, reject) => {

            if (!navigator.geolocation) {
                reject({ code: "indisponivel" });
                return;
            }

            navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
                }
            );

        });
    }

    // ======================================
    // CONSULTAR OPENSTREETMAP
    // ======================================

    async function buscarEcopontos(latitude, longitude) {

        const consulta = `
            [out:json][timeout:20];
            nwr(around:10000,${latitude},${longitude})["amenity"="recycling"];
            out center tags;
        `;

        const resposta = await fetch(
            "https://overpass-api.de/api/interpreter",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                },
                body: "data=" + encodeURIComponent(consulta)
            }
        );

        if (!resposta.ok) {
            throw new Error("Falha ao consultar o OpenStreetMap.");
        }

        const dados = await resposta.json();

        return dados.elements || [];
    }

    // ======================================
    // ORGANIZAR ECOPONTOS
    // ======================================

    function organizarPontos(elementos, latitude, longitude) {

        return elementos.map(ponto => {

            const lat = ponto.lat ?? ponto.center?.lat;
            const lon = ponto.lon ?? ponto.center?.lon;

            if (lat == null || lon == null) {
                return null;
            }

            const tags = ponto.tags || {};

            const rua = tags["addr:street"] || "";
            const numero = tags["addr:housenumber"] || "";
            const bairro = tags["addr:suburb"] || "";
            const cidade = tags["addr:city"] || "";

            const endereco = [
                rua,
                numero,
                bairro,
                cidade
            ].filter(Boolean).join(", ");

            return {
                nome: tags.name || tags.operator || "Ponto de reciclagem",
                endereco,
                lat,
                lon,
                distancia: calcularDistancia(
                    latitude,
                    longitude,
                    lat,
                    lon
                )
            };

        })
        .filter(Boolean)
        .sort((a, b) => a.distancia - b.distancia);
    }

    // ======================================
    // REMOVER PONTOS DUPLICADOS
    // ======================================

    function removerDuplicados(pontos) {

        const pontosUnicos = [];

        pontos.forEach(ponto => {

            const duplicado = pontosUnicos.some(outro => {

                const distancia = calcularDistancia(
                    ponto.lat,
                    ponto.lon,
                    outro.lat,
                    outro.lon
                );

                return distancia < 0.1;
            });

            if (!duplicado) {
                pontosUnicos.push(ponto);
            }

        });

        return pontosUnicos;
    }

    // ======================================
    // CRIAR CARD
    // ======================================

    function criarCard(ponto) {

        const card = document.createElement("div");
        card.className = "border rounded p-3 mb-3";

        const titulo = document.createElement("h6");
        titulo.className = "fw-bold text-success";
        titulo.textContent = ponto.nome;

        const endereco = document.createElement("p");
        endereco.className = "text-muted small mb-2";
        endereco.textContent = ponto.endereco || "Endereço não informado";

        const distancia = document.createElement("p");
        distancia.className = "small mb-2";
        distancia.textContent =
            `Distância aproximada: ${formatarDistancia(ponto.distancia)}`;

        const link = document.createElement("a");

        link.href =
            `https://www.openstreetmap.org/?mlat=${ponto.lat}&mlon=${ponto.lon}#map=18/${ponto.lat}/${ponto.lon}`;

        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "btn btn-sm btn-outline-success";
        link.textContent = "Ver localização no mapa";

        card.appendChild(titulo);
        card.appendChild(endereco);
        card.appendChild(distancia);
        card.appendChild(link);

        return card;
    }

    // ======================================
    // EXIBIR RESULTADOS
    // ======================================

    function exibirResultados(pontos) {

        lista.innerHTML = "";

        if (listaModal) {
            listaModal.innerHTML = "";
        }

        pontos.forEach(ponto => {

            lista.appendChild(criarCard(ponto));

            if (listaModal) {
                listaModal.appendChild(criarCard(ponto));
            }

        });
    }

    // ======================================
    // MOSTRAR ECOPONTOS NO MAPA
    // ======================================

    function adicionarMarcadores(pontos, latitude, longitude) {

        marcadores.clearLayers();

        // Localização do usuário
        const marcadorUsuario = L.marker([latitude, longitude]);

        marcadorUsuario.bindPopup("Você está aqui!");

        marcadores.addLayer(marcadorUsuario);

        // Ecopontos encontrados
        pontos.forEach(ponto => {

            const marcador = L.marker([ponto.lat, ponto.lon]);

            const popup = document.createElement("div");

            const titulo = document.createElement("strong");
            titulo.textContent = ponto.nome;

            const distancia = document.createElement("p");
            distancia.textContent = formatarDistancia(ponto.distancia);

            const link = document.createElement("a");

            link.href =
                `https://www.openstreetmap.org/?mlat=${ponto.lat}&mlon=${ponto.lon}#map=18/${ponto.lat}/${ponto.lon}`;

            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "Ver localização";

            popup.appendChild(titulo);
            popup.appendChild(distancia);
            popup.appendChild(link);

            marcador.bindPopup(popup);

            marcadores.addLayer(marcador);
        });

        const limites = L.latLngBounds([
            [latitude, longitude],
            ...pontos.map(ponto => [ponto.lat, ponto.lon])
        ]);

        mapa.fitBounds(limites, {
            padding: [40, 40],
            maxZoom: 14
        });

        setTimeout(() => mapa.invalidateSize(), 300);
    }

    // ======================================
    // TRATAR ERROS DE LOCALIZAÇÃO
    // ======================================

    function tratarErroLocalizacao(erro) {

        if (erro.code === 1) {
            return "Permita o acesso à localização no navegador para encontrar ecopontos próximos.";
        }

        if (erro.code === 2) {
            return "Não foi possível identificar sua localização.";
        }

        if (erro.code === 3) {
            return "A localização demorou demais. Tente novamente.";
        }

        return "Não conseguimos acessar sua localização.";
    }

    // ======================================
    // BUSCAR OS 3 ECOPONTOS MAIS PRÓXIMOS
    // ======================================

    async function abrirBuscaEcopontos() {

        btnLocalizar.disabled = true;

        btnLocalizar.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2"></span> Procurando...';

        limparResultados();

        atualizarStatus("Obtendo sua localização...");

        if (modal) {
            modal.show();
        }

        try {

            // ======================================
            // OBTER LOCALIZAÇÃO
            // ======================================

            const posicao = await obterLocalizacao();

            const latitude = posicao.coords.latitude;
            const longitude = posicao.coords.longitude;
            const precisao = posicao.coords.accuracy;

            console.log("Localização obtida:", {
                latitude,
                longitude,
                precisao: `${Math.round(precisao)} metros`
            });

            atualizarStatus(
                "Procurando pontos de reciclagem próximos..."
            );

            // ======================================
            // CONSULTAR OPENSTREETMAP
            // ======================================

            const elementos = await buscarEcopontos(
                latitude,
                longitude
            );

            // ======================================
            // ORGANIZAR PONTOS
            // ======================================

            const pontos = organizarPontos(
                elementos,
                latitude,
                longitude
            );

            // ======================================
            // REMOVER DUPLICADOS
            // ======================================

            const pontosUnicos = removerDuplicados(pontos);

            // ======================================
            // VERIFICAR RESULTADOS
            // ======================================

            if (pontosUnicos.length === 0) {

                atualizarStatus(
                    "Não encontramos pontos de reciclagem cadastrados em um raio de 10 km."
                );

                mapa.setView([latitude, longitude], 13);

                return;
            }

            // ======================================
            // SELECIONAR OS 3 MAIS PRÓXIMOS
            // ======================================

            const tresMaisProximos = pontosUnicos.slice(0, 3);

            // ======================================
            // EXIBIR NAS LISTAS
            // ======================================

            exibirResultados(tresMaisProximos);

            // ======================================
            // EXIBIR NO MAPA
            // ======================================

            adicionarMarcadores(
                tresMaisProximos,
                latitude,
                longitude
            );

            // ======================================
            // ATUALIZAR STATUS
            // ======================================

            let mensagem =
                `Encontramos ${tresMaisProximos.length} pontos de reciclagem próximos de você.`;

            if (precisao > 100) {

                mensagem +=
                    ` Atenção: sua localização está aproximada (margem de ${Math.round(precisao)} metros).`;
            }

            atualizarStatus(mensagem);

        } catch (erro) {

            console.error("Erro ao buscar ecopontos:", erro);

            limparResultados();

            if (erro.code !== undefined) {

                atualizarStatus(tratarErroLocalizacao(erro));

            } else {

                atualizarStatus(
                    "Não foi possível buscar os ecopontos no momento. Tente novamente mais tarde."
                );
            }

        } finally {

            btnLocalizar.disabled = false;

            btnLocalizar.innerHTML =
                '<i class="bi bi-geo-alt"></i> <span>Encontrar pontos próximos</span>';
        }
    }

    // ======================================
    // EVENTO DO BOTÃO
    // ======================================

    btnLocalizar.addEventListener(
        "click",
        abrirBuscaEcopontos
    );

});
