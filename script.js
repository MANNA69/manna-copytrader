
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(section => section.classList.remove('active'));
  document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
  event.target.classList.add('active');
}

function log(message) {
  const output = document.getElementById("log-output");
  output.innerHTML += `<p>${new Date().toLocaleTimeString()} - ${message}</p>`;
  output.scrollTop = output.scrollHeight;
}

function loginWithDeriv() {
  const app_id = 72379;
  const redirect_uri = "https://manna69.github.io/manna-copytrader/";
  window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${app_id}&redirect_uri=${redirect_uri}`;
}

function startCopying() {
  const masterToken = document.getElementById('master-token').value.trim();
  const followerTokens = document.getElementById('follower-token').value.trim().split(',').map(t => t.trim());
  if (!masterToken || followerTokens.length === 0 || !followerTokens[0]) {
    alert("Please provide both master and follower token(s).");
    return;
  }

  const masterSocket = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=72379");
  const followerSockets = followerTokens.map(token => new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=72379"));

  masterSocket.onopen = () => {
    masterSocket.send(JSON.stringify({ authorize: masterToken }));
  };

  masterSocket.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.msg_type === "authorize") {
      log("Master account authorized.");
    }
  };
}

window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    document.getElementById('master-token').value = token;
    log("Master token loaded from OAuth login.");
  }
};
