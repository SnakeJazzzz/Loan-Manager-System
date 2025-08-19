const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let db;

// Initialize SQLite database
function initDatabase() {
  const dbPath = isDev 
    ? path.join(__dirname, '..', 'loan_manager.db')
    : path.join(app.getPath('userData'), 'loan_manager.db');
    
  console.log('Database path:', dbPath);
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    } else {
      console.log('Database connected successfully');
      createTables();
    }
  });
}

function createTables() {
  db.serialize(() => {
    // Loans table
    db.run(`CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY,
      debtorName TEXT NOT NULL,
      originalPrincipal REAL NOT NULL,
      remainingPrincipal REAL NOT NULL,
      interestRate REAL NOT NULL,
      accruedInterest REAL DEFAULT 0,
      status TEXT DEFAULT 'Open',
      startDate TEXT NOT NULL,
      lastInterestAccrual TEXT,
      createdAt TEXT NOT NULL,
      destiny TEXT,
      loanNumber TEXT UNIQUE
    )`, (err) => {
      if (err) console.error('Error creating loans table:', err);
      else console.log('Loans table ready');
    });
    
    // Payments table
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY,
      loanId INTEGER NOT NULL,
      date TEXT NOT NULL,
      totalPaid REAL NOT NULL,
      interestPaid REAL NOT NULL,
      principalPaid REAL NOT NULL,
      FOREIGN KEY (loanId) REFERENCES loans(id)
    )`, (err) => {
      if (err) console.error('Error creating payments table:', err);
      else console.log('Payments table ready');
    });
    
    // Invoices table
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loanId INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      type TEXT,
      FOREIGN KEY (loanId) REFERENCES loans(id)
    )`, (err) => {
      if (err) console.error('Error creating invoices table:', err);
      else console.log('Invoices table ready');
    });
    
    // Interest Events table
    db.run(`CREATE TABLE IF NOT EXISTS interestEvents (
      id TEXT PRIMARY KEY,
      loanId INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      days INTEGER NOT NULL,
      principal REAL NOT NULL,
      FOREIGN KEY (loanId) REFERENCES loans(id)
    )`, (err) => {
      if (err) console.error('Error creating interestEvents table:', err);
      else console.log('InterestEvents table ready');
    });
    
    // Account Balance table
    db.run(`CREATE TABLE IF NOT EXISTS account_balance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balance REAL NOT NULL,
      transaction_type TEXT NOT NULL,
      transaction_amount REAL NOT NULL,
      related_loan_id INTEGER,
      description TEXT,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (related_loan_id) REFERENCES loans(id)
    )`, (err) => {
      if (err) console.error('Error creating account_balance table:', err);
      else console.log('Account Balance table ready');
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ========== IPC HANDLERS ==========

// Loans handlers
ipcMain.handle('db:getLoans', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM loans ORDER BY id ASC', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
});
// Reemplaza con:
ipcMain.handle('db:createLoan', async (event, loan) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO loans (id, debtorName, originalPrincipal, remainingPrincipal, 
        interestRate, accruedInterest, status, startDate, lastInterestAccrual, createdAt,
        destiny, loanNumber)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      loan.id, loan.debtorName, loan.originalPrincipal, loan.remainingPrincipal,
      loan.interestRate, loan.accruedInterest || 0, loan.status, loan.startDate, 
      loan.lastInterestAccrual || null, loan.createdAt,
      loan.destiny || null, loan.loanNumber || null,
      function(err) {
        if (err) reject(err);
        else resolve({ id: loan.id, success: true });
      }
    );
    stmt.finalize();
  });
});

ipcMain.handle('db:updateLoan', async (event, id, updates) => {
  return new Promise((resolve, reject) => {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    db.run(
      `UPDATE loans SET ${fields} WHERE id = ?`,
      values,
      (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
});

ipcMain.handle('db:deleteLoan', async (event, id) => {
  return new Promise((resolve, reject) => {
    // Delete in order: interestEvents, invoices, payments, then loan
    db.serialize(() => {
      db.run('DELETE FROM interestEvents WHERE loanId = ?', id);
      db.run('DELETE FROM invoices WHERE loanId = ?', id);
      db.run('DELETE FROM payments WHERE loanId = ?', id);
      db.run('DELETE FROM loans WHERE id = ?', id, (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  });
});

// Payments handlers
ipcMain.handle('db:getPayments', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM payments ORDER BY id DESC', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle('db:createPayment', async (event, payment) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO payments (id, loanId, date, totalPaid, interestPaid, principalPaid)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      payment.id, payment.loanId, payment.date, payment.totalPaid,
      payment.interestPaid, payment.principalPaid,
      function(err) {
        if (err) reject(err);
        else resolve({ id: payment.id, success: true });
      }
    );
    stmt.finalize();
  });
});

ipcMain.handle('db:deletePayment', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM payments WHERE id = ?', id, (err) => {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
});

// Invoices handlers
ipcMain.handle('db:getInvoices', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM invoices ORDER BY id DESC', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle('db:createInvoice', async (event, invoice) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO invoices (loanId, date, amount, description, type)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      invoice.loanId, invoice.date, invoice.amount, 
      invoice.description, invoice.type,
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, success: true });
      }
    );
    stmt.finalize();
  });
});

// Interest Events handlers
ipcMain.handle('db:getInterestEvents', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM interestEvents ORDER BY date DESC', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle('db:createInterestEvent', async (event, interestEvent) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO interestEvents (id, loanId, date, amount, days, principal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      interestEvent.id, interestEvent.loanId, interestEvent.date,
      interestEvent.amount, interestEvent.days, interestEvent.principal,
      function(err) {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
    stmt.finalize();
  });
});

// Account Transactions handlers
ipcMain.handle('db:getAccountTransactions', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM account_balance ORDER BY date ASC, id ASC', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle('db:createAccountTransaction', async (_, transaction) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO account_balance (balance, transaction_type, transaction_amount, 
        related_loan_id, description, date, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      transaction.balance, transaction.transaction_type, transaction.transaction_amount,
      transaction.related_loan_id || null, transaction.description, transaction.date, 
      transaction.createdAt,
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, success: true });
      }
    );
    stmt.finalize();
  });
});

// Test handler
ipcMain.handle('test-connection', async () => {
  return { success: true, message: 'Electron backend connected!' };
});