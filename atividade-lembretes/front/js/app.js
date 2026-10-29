const API_URL = "https://localhost:7063";

let paginaAtual = 1;
let ordemAtual = "DataCadastro";
let direcaoAtual = "DESC";
let totalAtual = 0;
let toastTimer;

const $ = (id) => document.getElementById(id);
const formulario = $("formulario");
const formLembrete = $("formLembrete");
const lembreteId = $("lembreteId");
const descricao = $("descricao");
const listaLembretes = $("listaLembretes");
const mensagemVazia = $("mensagemVazia");
const carregando = $("carregando");
const filtroDescricao = $("filtroDescricao");
const tamanhoPagina = $("tamanhoPagina");
const totalRegistros = $("totalRegistros");
const paginaAtualElemento = $("paginaAtual");
const btnAnterior = $("btnAnterior");
const btnProximo = $("btnProximo");
document.addEventListener("DOMContentLoaded", () => {
    carregarLembretes();
});

function obterParametros() {
    const params = new URLSearchParams();
    params.set("NumeroPagina", paginaAtual);
    params.set("TamanhoPagina", tamanhoPagina.value);
    params.set("Ordem", ordemAtual);
    params.set("Direcao", direcaoAtual);

    const filtros = {
        Descricao: filtroDescricao.value.trim(),
        DataCadastroInicial: $("cadastroInicial").value,
        DataCadastroFinal: $("cadastroFinal").value,
        DataAtualizacaoInicial: $("atualizacaoInicial").value,
        DataAtualizacaoFinal: $("atualizacaoFinal").value
    };

    Object.entries(filtros).forEach(([chave, valor]) => {
        if (valor) params.set(chave, valor);
    });

    return params;
}
async function carregarLembretes() {
    carregando.classList.remove("hidden");
    mensagemVazia.classList.add("hidden");
    listaLembretes.innerHTML = "";

    try {
        const params = obterParametros();
        const response = await fetch(`${API_URL}/lembretes/filtro?${params.toString()}`);
        if (!response.ok) throw new Error(await mensagemErro(response));

        const resultado = await response.json();
        const lembretes = resultado.lembretes || [];
        totalAtual = Number(resultado.total || 0);
        renderizarLembretes(lembretes);

        totalRegistros.textContent = totalAtual;
        paginaAtualElemento.textContent = `Página ${resultado.numeroPagina || paginaAtual}`;
        const inicio = totalAtual === 0 ? 0 : ((paginaAtual - 1) * Number(tamanhoPagina.value)) + 1;
        const fim = Math.min(paginaAtual * Number(tamanhoPagina.value), totalAtual);
        $("resumoPaginacao").textContent = `Mostrando ${inicio}–${fim} de ${totalAtual} registros`;
        btnAnterior.disabled = paginaAtual <= 1;
        btnProximo.disabled = paginaAtual * Number(tamanhoPagina.value) >= totalAtual;
        atualizarIndicadorOrdenacao();
    } catch (error) {
        console.error("Falha ao consultar a API:", error);
        mostrarToast("Não foi possível carregar os lembretes. Verifique se a API está em execução.", "error");
        totalRegistros.textContent = "—";
        $("resumoPaginacao").textContent = "Falha ao carregar os registros";
        btnAnterior.disabled = true;
        btnProximo.disabled = true;
    } finally {
        carregando.classList.add("hidden");
    }
}
async function imprimirLembretes() {
    try {
        const params = obterParametros();
        const response = await fetch(`${API_URL}/lembretes/imprimir?${params.toString()}`);
        if (!response.ok) throw new Error(await mensagemErro(response));
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "relatorio-lembretes.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        mostrarToast("Relatório gerado com sucesso!", "success");
    } catch (error) {
        console.error(error);
        mostrarToast("Não foi possível gerar o relatório.", "error");
    }
}
async function criarLembrete() {
    try {
        const response = await fetch(`${API_URL}/lembretes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descricao: descricao.value.trim() })
        });
        if (!response.ok) throw new Error(await mensagemErro(response));
        mostrarToast("Lembrete criado com sucesso!", "success");
        fecharFormulario();
        paginaAtual = 1;
        await carregarLembretes();
    } catch (error) {
        console.error(error);
        mostrarToast("Não foi possível criar o lembrete. Tente novamente.", "error");
    }
}
async function buscarLembrete(id) {
    try {
        const response = await fetch(`${API_URL}/lembretes/${encodeURIComponent(id)}`);
        if (!response.ok) throw new Error(await mensagemErro(response));
        const lembrete = await response.json();
        lembreteId.value = lembrete.id;
        descricao.value = lembrete.descricao || "";
        $("tituloFormulario").textContent = "Editar lembrete";
        formulario.classList.remove("hidden");
        formulario.scrollIntoView({ behavior: "smooth", block: "start" });
        descricao.focus();
    } catch (error) {
        console.error(error);
        mostrarToast("Não foi possível localizar esse lembrete.", "error");
    }
}
async function atualizarLembrete() {
    try {
        const response = await fetch(`${API_URL}/lembretes/${encodeURIComponent(lembreteId.value)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descricao: descricao.value.trim() })
        });
        if (!response.ok) throw new Error(await mensagemErro(response));
        mostrarToast("Lembrete atualizado com sucesso!", "success");
        fecharFormulario();
        await carregarLembretes();
    } catch (error) {
        console.error(error);
        mostrarToast("Não foi possível atualizar o lembrete.", "error");
    }
}
async function excluirLembrete(id) {
    if (!confirm("Deseja realmente excluir este lembrete?")) return;
    try {
        const response = await fetch(`${API_URL}/lembretes/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!response.ok) throw new Error(await mensagemErro(response));
        mostrarToast("Lembrete excluído com sucesso!", "success");
        if (listaLembretes.children.length === 1 && paginaAtual > 1) paginaAtual--;
        await carregarLembretes();
    } catch (error) {
        console.error(error);
        mostrarToast("Não foi possível excluir o lembrete.", "error");
    }
}
function renderizarLembretes(lembretes) {
    listaLembretes.innerHTML = "";
    if (!lembretes.length) {
        mensagemVazia.classList.remove("hidden");
        return;
    }
    mensagemVazia.classList.add("hidden");

    lembretes.forEach((lembrete) => {
        const tr = document.createElement("tr");
        const tdDescricao = document.createElement("td");
        tdDescricao.className = "description-cell";
        tdDescricao.textContent = lembrete.descricao || "Sem descrição";

        const tdCadastro = document.createElement("td");
        tdCadastro.textContent = formatarData(lembrete.dataCadastro);
        const tdAtualizacao = document.createElement("td");
        tdAtualizacao.textContent = formatarData(lembrete.dataAtualizacao);

        const tdStatus = document.createElement("td");
        const status = document.createElement("span");
        status.className = `status ${lembrete.isAtivo ? "status-ativo" : "status-inativo"}`;
        status.textContent = lembrete.isAtivo ? "Ativo" : "Inativo";
        tdStatus.appendChild(status);

        const tdAcoes = document.createElement("td");
        tdAcoes.className = "actions-cell";
        const acoes = document.createElement("div");
        acoes.className = "actions";
        const editar = document.createElement("button");
        editar.type = "button";
        editar.className = "action-btn";
        editar.textContent = "Editar";
        editar.addEventListener("click", () => buscarLembrete(lembrete.id));
        const excluir = document.createElement("button");
        excluir.type = "button";
        excluir.className = "action-btn delete";
        excluir.textContent = "Excluir";
        excluir.addEventListener("click", () => excluirLembrete(lembrete.id));
        acoes.append(editar, excluir);
        tdAcoes.appendChild(acoes);
        tr.append(tdDescricao, tdCadastro, tdAtualizacao, tdStatus, tdAcoes);
        listaLembretes.appendChild(tr);
    });
}

function abrirFormularioNovo() {
    formLembrete.reset();
    lembreteId.value = "";
    $("tituloFormulario").textContent = "Criar lembrete";
    formulario.classList.remove("hidden");
    formulario.scrollIntoView({ behavior: "smooth", block: "start" });
    descricao.focus();
}

function fecharFormulario() {
    formulario.classList.add("hidden");
    formLembrete.reset();
    lembreteId.value = "";
}

function limparFiltros() {
    filtroDescricao.value = "";
    ["cadastroInicial", "cadastroFinal", "atualizacaoInicial", "atualizacaoFinal"].forEach(id => $(id).value = "");
    paginaAtual = 1;
    carregarLembretes();
}

function atualizarIndicadorOrdenacao() {
    document.querySelectorAll(".sort-button").forEach(botao => {
        const ativo = botao.dataset.order === ordemAtual;
        botao.classList.toggle("sorted", ativo);
        botao.querySelector(".sort-indicator").textContent = ativo ? (direcaoAtual === "ASC" ? "↑" : "↓") : "↕";
    });
}

function formatarData(data) {
    if (!data) return "—";
    const valor = new Date(data);
    return Number.isNaN(valor.getTime()) ? "—" : valor.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

async function mensagemErro(response) {
    const texto = await response.text();
    return texto || `Erro HTTP ${response.status}`;
}

function mostrarToast(mensagem, tipo = "") {
    const toast = $("toast");
    toast.textContent = mensagem;
    toast.className = `toast ${tipo}`.trim();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 3800);
}
$("btnNovo").addEventListener("click", abrirFormularioNovo);
$("btnEmptyNovo").addEventListener("click", abrirFormularioNovo);
$("btnCancelar").addEventListener("click", fecharFormulario);
$("btnImprimir").addEventListener("click", imprimirLembretes);
$("btnFiltrar").addEventListener("click", () => { paginaAtual = 1; carregarLembretes(); });
$("btnLimparFiltros").addEventListener("click", limparFiltros);
filtroDescricao.addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); paginaAtual = 1; carregarLembretes(); }
});
formLembrete.addEventListener("submit", async event => {
    event.preventDefault();
    if (!descricao.value.trim()) {
        mostrarToast("Preencha a descrição antes de salvar.", "error");
        descricao.focus();
        return;
    }
    if (lembreteId.value) await atualizarLembrete();
    else await criarLembrete();
});
tamanhoPagina.addEventListener("change", () => { paginaAtual = 1; carregarLembretes(); });
btnAnterior.addEventListener("click", () => { if (paginaAtual > 1) { paginaAtual--; carregarLembretes(); } });
btnProximo.addEventListener("click", () => { if (paginaAtual * Number(tamanhoPagina.value) < totalAtual) { paginaAtual++; carregarLembretes(); } });
document.querySelectorAll(".sort-button").forEach(botao => {
    botao.addEventListener("click", () => {
        if (ordemAtual === botao.dataset.order) direcaoAtual = direcaoAtual === "ASC" ? "DESC" : "ASC";
        else { ordemAtual = botao.dataset.order; direcaoAtual = "ASC"; }
        paginaAtual = 1;
        carregarLembretes();
    });
});
