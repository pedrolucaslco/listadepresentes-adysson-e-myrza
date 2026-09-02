const CONFIG = {
  ABA_PRESENTES: 'Presentes',
  ABA_RESERVAS: 'Reservas',
};

function doGet(e) {
  const action = e.parameter.action;

  try {
    switch (action) {
      case 'presentes':
        return jsonResponse(getPresentes());

      case 'minha-reserva':
        return jsonResponse(
          getMinhaReserva(e.parameter.contato)
        );

      default:
        return jsonResponse({
          success: false,
          error: 'Ação inválida.',
        });
    }
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message,
    });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    switch (data.action) {
      case 'reservar':
        return jsonResponse(reservar(data));

      default:
        return jsonResponse({
          success: false,
          error: 'Ação inválida.',
        });
    }
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message,
    });
  }
}


// ============================================================
// PRESENTES
// ============================================================

function getPresentes() {
  const sheet = getSheet(CONFIG.ABA_PRESENTES);
  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return {
      success: true,
      presentes: [],
    };
  }

  return {
    success: true,
    presentes: rows.slice(1)
      .filter(row => row[0] !== '')
      .map(row => ({
        id: String(row[0]),
        categoria: row[1],
        nome: row[2],
        valor: Number(row[3]),
        unidades_total: Number(row[4]),
        unidades_disponiveis: Number(row[5]),
        url_imagem: row[6] || '',
      })),
  };
}


// ============================================================
// RESERVAS
// ============================================================

function getMinhaReserva(contato) {
  if (!contato) {
    throw new Error('Contato não informado.');
  }

  const contatoNormalizado =
    normalizarContato(contato);

  const sheet = getSheet(CONFIG.ABA_RESERVAS);
  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return {
      success: true,
      reservas: [],
    };
  }

  const reserva = rows.slice(1)
    .filter(row => row[0] !== '')
    .map(row => ({
      id: String(row[0]),
      presente_id: String(row[1]),
      nome: row[2],
      contato: row[3],
      data: row[4],
    }))
    .find(reserva =>
      normalizarContato(reserva.contato) ===
      contatoNormalizado
    );

  if (!reserva) {
    return {
      success: true,
      reservas: [],
    };
  }

  const presente = getPresentePorId(
    reserva.presente_id
  );

  return {
    success: true,
    reservas: [
      {
        ...reserva,
        presente,
      },
    ],
  };
}


function reservar(data) {
  const {
    presente_id,
    nome,
    contato,
  } = data;

  if (!presente_id) {
    throw new Error('Presente não informado.');
  }

  if (!nome || !nome.trim()) {
    throw new Error('Nome não informado.');
  }

  if (!contato || !contato.trim()) {
    throw new Error('Contato não informado.');
  }

  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    // ----------------------------------------------------------
    // Verifica se o contato já possui reserva
    // ----------------------------------------------------------

    const reservaExistente =
      getMinhaReserva(contato);

    if (reservaExistente.reservas.length > 0) {
      throw new Error(
        'Este contato já possui um presente reservado.'
      );
    }


    // ----------------------------------------------------------
    // Procura o presente
    // ----------------------------------------------------------

    const sheet =
      getSheet(CONFIG.ABA_PRESENTES);

    const rows =
      sheet.getDataRange().getValues();

    const index = rows.findIndex((row, i) =>
      i > 0 &&
      String(row[0]) === String(presente_id)
    );

    if (index === -1) {
      throw new Error(
        'Presente não encontrado.'
      );
    }

    const row = rows[index];

    const disponiveis = Number(row[5]);

    if (disponiveis <= 0) {
      throw new Error(
        'Este presente não está mais disponível.'
      );
    }


    // ----------------------------------------------------------
    // Diminui uma unidade
    // ----------------------------------------------------------

    sheet
      .getRange(index + 1, 6)
      .setValue(disponiveis - 1);


    // ----------------------------------------------------------
    // Cria a reserva
    // ----------------------------------------------------------

    const reservasSheet =
      getSheet(CONFIG.ABA_RESERVAS);

    const proximoId =
      gerarIdReserva(reservasSheet);

    reservasSheet.appendRow([
      proximoId,
      presente_id,
      nome.trim(),
      contato.trim(),
      new Date(),
    ]);


    return {
      success: true,

      reserva: {
        id: proximoId,
        presente_id: presente_id,
        nome: row[2],
        valor: Number(row[3]),
        unidades_disponiveis: disponiveis - 1,
      },
    };

  } finally {
    lock.releaseLock();
  }
}


// ============================================================
// SINCRONIZAÇÃO
// ============================================================

// Recalcula a coluna "unidades_disponiveis" da aba Presentes
// a partir das reservas atuais da aba Reservas.
// Rode manualmente no editor do Apps Script após apagar/editar
// reservas diretamente na planilha.
function sincronizarDisponibilidade() {
  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const presentesSheet =
      getSheet(CONFIG.ABA_PRESENTES);

    const reservasSheet =
      getSheet(CONFIG.ABA_RESERVAS);

    const linhasPresentes =
      presentesSheet.getDataRange().getValues();

    const linhasReservas =
      reservasSheet.getDataRange().getValues();

    if (linhasPresentes.length <= 1) {
      return {
        success: true,
        total_atualizados: 0,
        total_ajustados: 0,
        presentes: [],
      };
    }

    const reservasPorPresente = {};

    linhasReservas.slice(1).forEach(linha => {

      const presenteId = String(linha[1]).trim();

      if (presenteId === '') {
        return;
      }

      reservasPorPresente[presenteId] =
        (reservasPorPresente[presenteId] || 0) + 1;

    });

    const colunaDisponiveis = [];
    const atualizados = [];
    let ajustados = 0;

    linhasPresentes.forEach((linha, i) => {

      if (
        i === 0 ||
        String(linha[0]).trim() === ''
      ) {

        colunaDisponiveis.push(linha[5]);
        return;

      }

      const presenteId = String(linha[0]);

      const unidadesTotal = Number(linha[4]);
      const totalBase = isNaN(unidadesTotal)
        ? Number(linha[5])
        : unidadesTotal;

      if (isNaN(totalBase)) {

        colunaDisponiveis.push(linha[5]);
        return;

      }

      const reservadas =
        reservasPorPresente[presenteId] || 0;

      const disponiveis =
        Math.max(totalBase - reservadas, 0);

      if (disponiveis !== Number(linha[5])) {
        ajustados++;
      }

      colunaDisponiveis.push(disponiveis);

      atualizados.push({
        id: presenteId,
        nome: linha[2],
        unidades_total: totalBase,
        reservadas,
        unidades_disponiveis: disponiveis,
      });

    });

    presentesSheet
      .getRange(1, 6, linhasPresentes.length, 1)
      .setValues(
        colunaDisponiveis.map(valor => [valor])
      );

    return {
      success: true,
      total_atualizados: atualizados.length,
      total_ajustados: ajustados,
      presentes: atualizados,
    };

  } finally {
    lock.releaseLock();
  }
}


// ============================================================
// HELPERS
// ============================================================

function getPresentePorId(id) {
  const sheet = getSheet(CONFIG.ABA_PRESENTES);
  const rows = sheet.getDataRange().getValues();

  const row = rows.slice(1).find(row =>
    String(row[0]) === String(id)
  );

  if (!row) {
    return null;
  }

  return {
    id: String(row[0]),
    categoria: row[1],
    nome: row[2],
    valor: Number(row[3]),
    unidades_total: Number(row[4]),
    unidades_disponiveis: Number(row[5]),
    url_imagem: row[6] || '',
  };
}


function gerarIdReserva(sheet) {
  const rows = sheet.getDataRange().getValues();

  const ids = rows
    .slice(1)
    .map(row => Number(row[0]))
    .filter(id =>
      Number.isInteger(id) && id > 0
    );

  if (ids.length === 0) {
    return 1;
  }

  const usados = new Set(ids);

  for (let i = 1; i <= ids.length + 1; i++) {
    if (!usados.has(i)) {
      return i;
    }
  }
}


function normalizarContato(contato) {
  return String(contato)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}


function getSheet(nome) {
  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(nome);

  if (!sheet) {
    throw new Error(
      `A aba "${nome}" não foi encontrada.`
    );
  }

  return sheet;
}


function jsonResponse(data) {
  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}
