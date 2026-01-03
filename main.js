import './style.css'

const app = document.querySelector('#app')

app.innerHTML = `
  <div class="container">
    <div class="card">
      <p class="status" id="status">読み込み中...</p>
      <div class="button-group">
        <button id="getTokenBtn" class="btn" disabled>トークンを取得</button>
        <button id="validateBtn" class="btn btn-secondary" disabled>トークンを検証</button>
      </div>
      <div id="result" class="result"></div>
    </div>
  </div>
`

const statusEl = document.getElementById('status')
const getTokenBtn = document.getElementById('getTokenBtn')
const validateBtn = document.getElementById('validateBtn')
const resultEl = document.getElementById('result')

let currentToken = ''

async function waitForNonStress() {
  const maxAttempts = 50
  let attempts = 0
  
  while (attempts < maxAttempts) {
    if (window.nonstress && typeof window.nonstress.getToken === 'function' && (await window.nonstress.getToken()).trim() !== "") {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  return false
}

async function init() {
  try {
    const loaded = await waitForNonStress()
    if (loaded) {
      statusEl.textContent = '準備完了'
      statusEl.className = 'status success'
      getTokenBtn.disabled = false
      validateBtn.disabled = false
    } else {
      statusEl.textContent = 'NonStressスクリプトの読み込みに失敗しました'
      statusEl.className = 'status error'
    }
  } catch (error) {
    statusEl.textContent = `エラー: ${error.message}`
    statusEl.className = 'status error'
    console.error('初期化エラー:', error)
  }
}

async function getToken() {
  try {
    getTokenBtn.disabled = true
    validateBtn.disabled = true
    statusEl.textContent = 'トークン取得中...'
    statusEl.className = 'status loading'
    resultEl.innerHTML = ''
    
    const token = await window.nonstress.getToken()
    
    if (!token || token === '') {
      statusEl.textContent = 'CAPTCHAチャレンジが未完了です'
      statusEl.className = 'status error'
      resultEl.innerHTML = `
        <div class="error-message">
          <p>トークンが空です。ページをリロードして再度お試しください。</p>
        </div>
      `
      getTokenBtn.disabled = false
      validateBtn.disabled = false
      return
    }
    
    if (token === 'Failed') {
      statusEl.textContent = 'CAPTCHAチャレンジが失敗しました'
      statusEl.className = 'status error'
      resultEl.innerHTML = `
        <div class="error-message">
          <p>CAPTCHAチャレンジが失敗しました。ページをリロードして再度お試しください。</p>
        </div>
      `
      getTokenBtn.disabled = false
      validateBtn.disabled = false
      return
    }
    
    currentToken = token
    statusEl.textContent = 'トークン取得成功'
    statusEl.className = 'status success'
    
    resultEl.innerHTML = `
      <div class="token-container">
        <h3>取得したトークン:</h3>
        <div class="token-value" id="tokenValue">${token}</div>
        <button id="copyBtn" class="btn btn-secondary">コピー</button>
      </div>
    `
    
    const copyBtn = document.getElementById('copyBtn')
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(token).then(() => {
        copyBtn.textContent = 'コピーしました！'
        setTimeout(() => {
          copyBtn.textContent = 'コピー'
        }, 2000)
      }).catch(err => {
        console.error('コピーに失敗しました:', err)
        copyBtn.textContent = 'コピー失敗'
      })
    })
    
    getTokenBtn.disabled = false
    validateBtn.disabled = false
  } catch (error) {
    statusEl.textContent = `トークン取得エラー: ${error.message}`
    statusEl.className = 'status error'
    resultEl.innerHTML = `<div class="error-message">エラー: ${error.message}</div>`
    getTokenBtn.disabled = false
    validateBtn.disabled = false
    console.error('トークン取得エラー:', error)
  }
}

// トークン検証
async function validateToken() {
  if (!currentToken) {
    resultEl.innerHTML = `
      <div class="error-message">
        <p>まずトークンを取得してください。</p>
      </div>
    `
    return
  }
  
  try {
    validateBtn.disabled = true
    statusEl.textContent = 'トークン検証中...'
    statusEl.className = 'status loading'
    
    const response = await fetch('https://hamutan86.pythonanywhere.com/nonstress/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: currentToken
      })
    })
    
    const data = await response.json()
    
    if (data.error) {
      statusEl.textContent = 'トークン検証失敗'
      statusEl.className = 'status error'
      
      resultEl.innerHTML = `
        <div class="validation-result">
          <h3>検証結果</h3>
          <div class="result-item">
            <span class="result-label">ステータス:</span>
            <span class="result-value error">✗ 検証失敗</span>
          </div>
          <div class="result-item">
            <span class="result-label">エラー:</span>
            <span class="result-value">${data.error}</span>
          </div>
        </div>
      `
    } else if (data.security && data.security.pass) {
      statusEl.textContent = 'トークン検証成功'
      statusEl.className = 'status success'
      
      resultEl.innerHTML = `
        <div class="validation-result">
          <h3>検証結果</h3>
          <div class="result-item">
            <span class="result-label">ステータス:</span>
            <span class="result-value success">✓ 検証成功</span>
          </div>
          <div class="result-item">
            <span class="result-label">スコア:</span>
            <span class="result-value" style="font-weight: bold;">
              ${data.security.score}
            </span>
          </div>
          ${data.security.url ? `
            <div class="result-item">
              <span class="result-label">URL:</span>
              <span class="result-value small">${data.security.url}</span>
            </div>
          ` : ''}
          ${data.user ? `
            <div class="visitor-data">
              <h4>ユーザーデータ:</h4>
              <div class="result-item">
                <span class="result-label">User-Agent:</span>
                <span class="result-value small">${data.user['user-agent'] || 'N/A'}</span>
              </div>
              <div class="result-item">
                <span class="result-label">IP:</span>
                <span class="result-value small">${data.user.ip || 'N/A'}</span>
              </div>
              <div class="result-item">
                <span class="result-label">Device Fingerprint:</span>
                <span class="result-value small">${data.user.device_fingerprint || 'N/A'}</span>
              </div>
            </div>
          ` : ''}
        </div>
      `
    } else {
      statusEl.textContent = 'トークン検証失敗'
      statusEl.className = 'status error'
      
      resultEl.innerHTML = `
        <div class="validation-result">
          <h3>検証結果</h3>
          <div class="result-item">
            <span class="result-label">ステータス:</span>
            <span class="result-value error">✗ 検証失敗</span>
          </div>
          <div class="result-item">
            <span class="result-label">エラー:</span>
            <span class="result-value">不明なエラー</span>
          </div>
        </div>
      `
    }
    
    validateBtn.disabled = false
  } catch (error) {
    statusEl.textContent = `検証エラー: ${error.message}`
    statusEl.className = 'status error'
    resultEl.innerHTML = `<div class="error-message">エラー: ${error.message}</div>`
    validateBtn.disabled = false
    console.error('検証エラー:', error)
  }
}

getTokenBtn.addEventListener('click', getToken)
validateBtn.addEventListener('click', validateToken)

init()
