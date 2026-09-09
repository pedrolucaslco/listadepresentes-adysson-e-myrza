const API_URL = 'https://script.google.com/macros/s/AKfycbzKVbuFQDiNu1ShDAMZNWj9B-CkeDhlaUsjZjTu0Wwalez2urW-fjNdJ1PsHSFUh-eBcA/exec';

const PIX_CHAVE = '00020126360014BR.GOV.BCB.PIX0114+55849811332125204000053039865802BR5925Adysson Cleysson da Silva6009SAO PAULO62140510C0h2Db6n4p6304B231';

const PIX_CODIGO = '84981133212';

const WHATSAPP_LINK = 'https://wa.me/5584981133212';

let presentes = [];
let categoriaAtual = 'Todos';
let presenteSelecionado = null;

let convidado = {
    nome: '',
    contato: '',
};

const guestForm = document.querySelector('#guest-form');
const loginButton = document.querySelector('#guest-form button[type="submit"]');
const giftsSection = document.querySelector('#gifts-section');
const giftsContainer = document.querySelector('#gifts');
const categoriesContainer = document.querySelector('#categories');

const guestBar = document.querySelector('#guest-bar');
const guestName = document.querySelector('#guest-name');
const guestContact = document.querySelector('#guest-contact');

const notice = document.querySelector('#reservation-notice');
const noticeMessage = document.querySelector('#notice-message');
const noticeClose = document.querySelector('#notice-close');

const myReservation = document.querySelector('#my-reservation');
const myReservationCard = document.querySelector('#my-reservation-card');

const modal = document.querySelector('#modal');
const modalBody = document.querySelector('#modal-body');
const modalClose = document.querySelector('#modal-close');

const logoutButton = document.querySelector('#logout-button');

const toast = document.querySelector('#toast');


// ============================================================
// Inicialização
// ============================================================

guestForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    convidado.nome =
        document.querySelector('#nome').value.trim();

    convidado.contato =
        document.querySelector('#contato').value.trim();

    definirCarregando(
        loginButton,
        'Entrando...',
        true
    );

    try {

        await entrar();

    } finally {

        definirCarregando(
            loginButton,
            'Continuar',
            false
        );

    }

});

logoutButton.addEventListener('click', () => {

    localStorage.removeItem('convidado');

    convidado = {
        nome: '',
        contato: '',
    };

    giftsSection.classList.add('hidden');
    guestBar.classList.add('hidden');
    notice.classList.add('hidden');
    myReservation.classList.add('hidden');
    myReservationCard.innerHTML = '';

    document.querySelector('.guest-section')
        .classList.remove('hidden');

    document.querySelector('#guest-message').textContent = '';

});

modalClose.addEventListener('click', fecharModal);

modal.addEventListener('click', (event) => {

    if (event.target === modal) {
        fecharModal();
    }

});

document.addEventListener('keydown', (event) => {

    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
        fecharModal();
    }

});

noticeClose.addEventListener('click', () => {

    notice.classList.add('hidden');

});

const bannerCopyButton =
    document.querySelector('#banner-copy-pix');

bannerCopyButton.addEventListener('click', copiarChavePix);


// ============================================================
// Entrar
// ============================================================

async function entrar() {

    try {

        const reserva = await buscarReserva(
            convidado.contato
        );

        localStorage.setItem(
            'convidado',
            JSON.stringify(convidado)
        );

        await carregarPresentes();

        document.querySelector('.guest-section')
            .classList.add('hidden');

        giftsSection.classList.remove('hidden');

        guestName.textContent = convidado.nome;
        guestContact.textContent = convidado.contato;
        guestBar.classList.remove('hidden');

        if (reserva.reservas.length > 0) {
            mostrarReserva(reserva.reservas[0]);
        }

    } catch (error) {

        mostrarErro(error.message);

    }

}

function iniciar() {

    const salvo = localStorage.getItem('convidado');

    if (!salvo) {
        return;
    }

    try {

        convidado = JSON.parse(salvo);

        entrar();

    } catch (error) {

        localStorage.removeItem('convidado');

        convidado = {
            nome: '',
            contato: '',
        };

    }

}


// ============================================================
// Carregar presentes
// ============================================================

async function carregarPresentes() {

    giftsContainer.innerHTML = gerarSkeleton();
    giftsContainer.classList.add('loading');

    let data;

    try {

        const response = await fetch(
            `${API_URL}?action=presentes`
        );

        data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

    } catch (error) {

        giftsContainer.innerHTML = '';
        giftsContainer.classList.remove('loading');

        throw error;

    }

    presentes = data.presentes;

    giftsContainer.classList.remove('loading');

    renderizarCategorias();
    renderizarPresentes();
}

function gerarSkeleton() {

    const cards = [];

    for (let i = 0; i < 6; i++) {

        cards.push(`
            <article class="gift gift-skeleton" aria-hidden="true">
                <div class="gift-image"></div>
                <div class="gift-content">
                    <div class="sk sk-cat"></div>
                    <div class="sk sk-title"></div>
                    <div class="sk sk-price"></div>
                    <div class="sk sk-btn"></div>
                </div>
            </article>
        `);

    }

    return cards.join('');
}


// ============================================================
// Categorias
// ============================================================

function renderizarCategorias() {

    const categorias = [
        'Todos',
        ...new Set(
            presentes.map(presente => presente.categoria)
        )
    ];

    categoriesContainer.innerHTML = '';

    categorias.forEach(categoria => {

        const button = document.createElement('button');

        button.textContent = categoria;

        button.classList.add('category-button');

        if (categoria === categoriaAtual) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {

            categoriaAtual = categoria;

            renderizarCategorias();
            renderizarPresentes();

        });

        categoriesContainer.appendChild(button);

    });

}


// ============================================================
// Presentes
// ============================================================

function renderizarPresentes() {

    const filtrados =
        categoriaAtual === 'Todos'
            ? presentes
            : presentes.filter(
                presente =>
                    presente.categoria === categoriaAtual
            );

    filtrados.sort((a, b) => {
        const aIndisponivel = a.unidades_disponiveis <= 0;
        const bIndisponivel = b.unidades_disponiveis <= 0;
        return aIndisponivel - bIndisponivel;
    });

    giftsContainer.innerHTML = '';

    filtrados.forEach(presente => {

        const card = document.createElement('article');

        card.className = 'gift';

        const indisponivel =
            presente.unidades_disponiveis <= 0;

        card.innerHTML = `
            ${
                presente.url_imagem
                    ? `
                        <div class="gift-image">
                            <img
                                src="${escapeHtml(presente.url_imagem)}"
                                alt="${escapeHtml(presente.nome)}"
                                loading="lazy"
                            >
                        </div>
                    `
                    : ''
            }

            <div class="gift-content">

                <div class="gift-category">
                    ${escapeHtml(presente.categoria)}
                </div>

                <h3>
                    ${escapeHtml(presente.nome)}
                </h3>

                <div class="gift-price">
                    ${formatarValor(presente.valor)}
                </div>

                <div class="gift-available">
                    ${
                        indisponivel
                            ? 'Indisponível'
                            : `${presente.unidades_disponiveis} cota(s)`
                    }
                </div>

                <button
                    ${indisponivel ? 'disabled' : ''}
                    data-id="${escapeHtml(presente.id)}"
                >
                    ${
                        indisponivel
                            ? 'Indisponível'
                            : 'Escolher presente'
                    }
                </button>

            </div>
        `;

        const button = card.querySelector('button');

        if (!indisponivel) {

            button.addEventListener('click', () => {
                abrirModal(presente);
            });

        }

        giftsContainer.appendChild(card);

    });

}


// ============================================================
// Modal
// ============================================================

function abrirModal(presente) {

    presenteSelecionado = presente;

    renderizarViewConfirmacao(presente);

    modal.classList.remove('hidden');

}


function fecharModal() {

    presenteSelecionado = null;

    modal.classList.add('hidden');

    modalBody.innerHTML = '';

}


function renderizarViewConfirmacao(presente) {

    modalBody.innerHTML = `
        <h2 id="modal-title">
            ${escapeHtml(presente.nome)}
        </h2>

        <p class="modal-description">
            Você deseja reservar este presente por
            <strong>${formatarValor(presente.valor)}</strong>?
        </p>

        <div class="modal-actions">
            <button id="modal-cancel" class="secondary" type="button">
                Cancelar
            </button>

            <button id="confirm-button" type="button">
                Confirmar presente
            </button>
        </div>
    `;

    const cancelar =
        document.querySelector('#modal-cancel');

    const confirmar =
        document.querySelector('#confirm-button');

    cancelar.addEventListener('click', fecharModal);

    confirmar.addEventListener('click', confirmarReserva);

    cancelar.focus();

}


function renderizarViewSucesso() {

    const presente = presenteSelecionado;

    modalBody.innerHTML = `
        <h2 id="modal-title">
            Presente reservado com sucesso!
        </h2>

        <p class="modal-description">
            Você reservou
            <strong>${escapeHtml(presente.nome)}</strong>
            no valor de
            <strong>${formatarValor(presente.valor)}</strong>.
            Agora escolha como deseja entregar o presente:
            falar com os noivos ou enviar o Pix.
        </p>

        <div class="modal-actions">
            <button id="falando-com-noivos" type="button" class="whatsapp-button">
                Falar com os noivos
            </button>

            <button id="enviar-pix" type="button" class="secondary">
                Enviar Pix do presente
            </button>
        </div>
    `;

    document.querySelector('#falando-com-noivos')
        .addEventListener('click', () => {
            window.open(
                WHATSAPP_LINK,
                '_blank',
                'noopener'
            );
        });

    document.querySelector('#enviar-pix')
        .addEventListener('click', renderizarViewPix);

    document.querySelector('#falando-com-noivos')
        .focus();

}


function renderizarViewPix() {

    const presente = presenteSelecionado;

    modalBody.innerHTML = `
        <h2 id="modal-title">
            Pix para os noivos
        </h2>

        <ol class="pix-steps">
            <li>
                Copie a chave Pix abaixo.
            </li>

            <li>
                No app do seu banco, faça o Pix no
                valor de
                <strong>${formatarValor(presente.valor)}</strong>.
            </li>

            <li>
                Envie o comprovante pelo WhatsApp.
            </li>
        </ol>

        <div class="pix-key-box">
            <span class="pix-key-label">
                Chave Pix (copia e cola)
            </span>

            <code class="pix-key">
                ${escapeHtml(PIX_CHAVE)}
            </code>

            <button
                type="button"
                class="pix-copy"
                id="pix-copy-button"
            >
                Copiar chave Pix
            </button>
        </div>

        <p class="pix-hint">
            Ou use a chave por telefone:
            <strong>${escapeHtml(PIX_CODIGO)}</strong>
        </p>

        <div class="modal-actions">
            <button id="pix-voltar" type="button" class="secondary">
                Voltar
            </button>

            <button id="pix-comprovante" type="button" class="whatsapp-button">
                Enviar comprovante pelo WhatsApp
            </button>
        </div>
    `;

    document.querySelector('#pix-copy-button')
        .addEventListener('click', copiarChavePix);

    document.querySelector('#pix-voltar')
        .addEventListener('click', renderizarViewSucesso);

    document.querySelector('#pix-comprovante')
        .addEventListener('click', () => {
            window.open(
                WHATSAPP_LINK,
                '_blank',
                'noopener'
            );
        });

    document.querySelector('#pix-copy-button')
        .focus();

}


// ============================================================
// Reserva
// ============================================================

async function confirmarReserva() {

    const botaoConfirmar =
        document.querySelector('#confirm-button');

    if (!presenteSelecionado || !botaoConfirmar) {
        return;
    }

    definirCarregando(
        botaoConfirmar,
        'Reservando...',
        true
    );

    try {

        const response = await fetch(API_URL, {

            method: 'POST',

            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },

            body: JSON.stringify({
                action: 'reservar',

                presente_id:
                    presenteSelecionado.id,

                nome:
                    convidado.nome,

                contato:
                    convidado.contato,

                tipo_contato:
                    detectarTipoContato(
                        convidado.contato
                    ),
            }),

        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        renderizarViewSucesso();

        await carregarPresentes();

    } catch (error) {

        mostrarToast(error.message, 'erro');

    } finally {

        definirCarregando(
            botaoConfirmar,
            'Confirmar presente',
            false
        );

    }

}


// ============================================================
// Verificar reserva existente
// ============================================================

async function buscarReserva(contato) {

    const response = await fetch(
        `${API_URL}?action=minha-reserva&contato=${encodeURIComponent(contato)}`
    );

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error);
    }

    return data;
}


function mostrarReserva(reserva) {

    const presente = reserva.presente;

    myReservationCard.innerHTML = `
        ${
            presente.url_imagem
                ? `
                    <div class="gift-image">
                        <img
                            src="${escapeHtml(presente.url_imagem)}"
                            alt="${escapeHtml(presente.nome)}"
                            loading="lazy"
                        >
                    </div>
                `
                : ''
        }

        <div class="my-reservation-info">

            <div class="gift-category">
                ${escapeHtml(presente.categoria)}
            </div>

            <h3>
                ${escapeHtml(presente.nome)}
            </h3>

            <div class="gift-price">
                ${formatarValor(presente.valor)}
            </div>

            <div class="gift-available">
                Reservado! Obrigado pela ajuda.
            </div>

        </div>
    `;

    myReservation.classList.remove('hidden');

}


// ============================================================
// Utilidades
// ============================================================

function formatarValor(valor) {

    return new Intl.NumberFormat(
        'pt-BR',
        {
            style: 'currency',
            currency: 'BRL',
        }
    ).format(valor);

}


function detectarTipoContato(contato) {

    return contato.includes('@')
        ? 'email'
        : 'telefone';

}


function escapeHtml(text) {

    const div = document.createElement('div');

    div.textContent = text;

    return div.innerHTML;

}


function copiarChavePix(event) {

    const botao = event.currentTarget;

    const rotuloOriginal = botao.textContent;

    const exibirCopiado = () => {

        botao.textContent = 'Copiado!';

        setTimeout(() => {
            botao.textContent = rotuloOriginal;
        }, 2000);

    };

    if (
        navigator.clipboard
        && navigator.clipboard.writeText
    ) {

        navigator.clipboard.writeText(PIX_CHAVE)
            .then(exibirCopiado)
            .catch(() => {
                copiarFallback(PIX_CHAVE);
                exibirCopiado();
            });

        return;

    }

    copiarFallback(PIX_CHAVE);

    exibirCopiado();

}


function copiarFallback(texto) {

    const textarea = document.createElement('textarea');

    textarea.value = texto;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);

    textarea.select();

    try {
        document.execCommand('copy');
    } catch (erro) {}

    document.body.removeChild(textarea);

}


function definirCarregando(botao, rotulo, ativo) {

    botao.textContent = rotulo;

    botao.disabled = ativo;

    botao.classList.toggle('is-loading', ativo);

}


function mostrarToast(mensagem, tipo) {

    toast.textContent = mensagem;

    toast.className = `toast visible ${tipo}`;

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {

        toast.classList.remove('visible');

    }, 4000);

}


function mostrarErro(mensagem) {

    const element =
        document.querySelector('#guest-message');

    element.textContent = mensagem;

}


iniciar();
