

document.addEventListener('DOMContentLoaded', function() {
    
    // --- ✨ NOUVEL AJOUT : Effets de chargement ---
    
    // 1. Trouver les éléments principaux de la page
    const header = document.querySelector('header');
    const nav = document.querySelector('nav.navigation');
    const main = document.querySelector('main');
    const footer = document.querySelector('footer');
    
    // 2. Mettre les éléments dans une "liste" pour les animer
    const elementsToAnimate = [header, nav, main, footer].filter(Boolean);
    
    // 3. Appliquer les classes d'animation avec un délai pour chaque
    elementsToAnimate.forEach((el, index) => {
        // 'animate-on-load' est la classe de base de l'animation
        el.classList.add('animate-on-load');
        
        // 'delay-X' ajoute un décalage (0.1s, 0.2s, etc.)
        // (index + 1) car l'index commence à 0
        el.classList.add('delay-' + (index + 1));
    });
    // --- ✨ FIN DE L'AJOUT ---

    
    // --- Système de Modale Générique Bêta ---
    const betaModal = document.getElementById('betaModal');
    const openBetaBtns = document.querySelectorAll('.open-beta-modal'); 
    const closeBetaBtnX = document.getElementById('closeBetaModalBtn');
    const closeBetaBtnConfirm = document.getElementById('confirmCloseBetaModalBtn');
    const betaModalFeatureName = document.getElementById('betaModalFeatureName');
    const betaModalTitle = document.getElementById('betaModalTitle');


    // Fonction pour fermer la modale
    function closeBetaModal() {
        betaModal.style.display = 'none';
    }

    // 1. Gestionnaires d'ouverture pour TOUS les boutons
    openBetaBtns.forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            const featureName = btn.textContent;
            const modalTitle = btn.dataset.modalTitle;
            betaModalTitle.textContent = modalTitle;
            betaModalFeatureName.textContent = featureName;
            
            betaModal.style.display = 'block';
        }
    });

    // 2. Gestionnaires de fermeture (bouton 'x' et bouton 'Compris')
    closeBetaBtnX.onclick = closeBetaModal;
    closeBetaBtnConfirm.onclick = closeBetaModal;

    // 3. Fermeture par clic sur l'overlay
    window.onclick = function(event) {
        if (event.target == betaModal) {
            closeBetaModal();
        }
    }

    // 4. Fermeture par la touche ESC
    document.onkeydown = function(event) {
        if (event.key === "Escape" && betaModal.style.display === 'block') {
            closeBetaModal();
        }
    }
});
