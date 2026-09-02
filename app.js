const API_URL = 'https://script.google.com/macros/s/AKfycbzKVbuFQDiNu1ShDAMZNWj9B-CkeDhlaUsjZjTu0Wwalez2urW-fjNdJ1PsHSFUh-eBcA/exec';

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

const modal = document.querySelector('#modal');
const modalTitle = document.querySelector('#modal-title');
const modalDescription = document.querySelector('#modal-description');

const confirmButton = document.querySelector('#confirm-button');
const modalCancel = document.querySelector('#modal-cancel');
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

    document.querySelector('.guest-section')
        .classList.remove('hidden');

    document.querySelector('#guest-message').textContent = '';

});

modalClose.addEventListener('click', fecharModal);
modalCancel.addEventListener('click', fecharModal);

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
                            : `${presente.unidades_disponiveis} disponível(is)`
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

    modalTitle.textContent = presente.nome;

    modalDescription.textContent =
        `Você deseja reservar este presente por ${formatarValor(presente.valor)}?`;

    modal.classList.remove('hidden');

    modalCancel.focus();

}


function fecharModal() {

    presenteSelecionado = null;

    modal.classList.add('hidden');

}


// ============================================================
// Reserva
// ============================================================

confirmButton.addEventListener('click', async () => {

    if (!presenteSelecionado) {
        return;
    }

    definirCarregando(
        confirmButton,
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

        fecharModal();

        mostrarToast(
            'Presente reservado com sucesso!',
            'sucesso'
        );

        await carregarPresentes();

    } catch (error) {

        mostrarToast(error.message, 'erro');

    } finally {

        definirCarregando(
            confirmButton,
            'Confirmar presente',
            false
        );

    }

});


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

    noticeMessage.textContent = presente
        ? `Você já reservou "${presente.nome}". Obrigado pela ajuda!`
        : 'Você já reservou um presente com este contato.';

    notice.classList.remove('hidden');

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
