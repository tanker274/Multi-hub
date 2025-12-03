const notifContainer = document.getElementById('notifContainer');

function pushNotif(message, color = 'orange') {
  const notif = document.createElement('div');
  notif.className = `notif notif-${color}`;
  notif.textContent = message;

  notifContainer.appendChild(notif);

  setTimeout(() => notif.classList.add('visible'), 20);
  setTimeout(() => {
    notif.style.animation = 'fadeOut .5s forwards';
    setTimeout(() => notif.remove(), 500);
  }, 3500);
}

// ================================================
// ACTIVATION / DÉSACTIVATION AUTOMATIQUE DES BOUTONS
// ================================================
document.querySelectorAll('a, button').forEach(link => {
  const isActive = link.dataset.active === "true";

  if (!isActive) {
    // Désactive l’action
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const color = link.dataset.color || "orange";

      // Notification maintenance
      pushNotif(`[MAINTENANCE] "${link.textContent}" est désactivé`, color);
    });

    // Style visuel pour montrer qu'il est OFF
    link.classList.add("link-disabled");
  }
});



const titleEl = document.getElementById('site-title');
  // --------------------------
  // Typewriter effet titre
  // --------------------------
  const baseText = titleEl.textContent.replace('▮','').trim();
  titleEl.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  cursor.textContent = '▮';

  let i = 0;
  (function typeWriter() {
    if(i <= baseText.length){
      titleEl.textContent = baseText.slice(0,i++);
      titleEl.appendChild(cursor);
      setTimeout(typeWriter,30);
    } else {
      titleEl.textContent = baseText;
      titleEl.appendChild(cursor);
    }
  })();
;
