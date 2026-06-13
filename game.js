// Das Fundament: Die Basis-Struktur
let base = {
    name: "Hauptquartier",
    type: "Stationäres Rathaus",
    isDsiActive: false
};

let hq = {
    isMobile: false
};

// Die „Erweckungs-Funktion“ (Die Magie)
function activateDsiMode() {
    if (!base.isDsiActive) {
        // Zustand ändern
        base.isDsiActive = true;
        base.type = "Mobile-DSI-Zentrale";
        
        // HQ aktivieren
        hq.isMobile = true;
        
        console.log("--- SYSTEM UPDATE ---");
        console.log("Status: " + base.type + " ist nun einsatzbereit.");
        console.log("Mobilität: Aktiviert. Zentrale kann nun verlegt werden.");
    } else {
        console.log("Fehler: DSI-Modus ist bereits aktiv.");
    }
}

// Testlauf:
activateDsiMode();
