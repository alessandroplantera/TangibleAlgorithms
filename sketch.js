///////////////////////////////////////////// CARICAMENTO DEL JSON E POPOLAMENTO ARRAY ///////////////////////////////////////////

let imagesData = []; // Array per memorizzare i dati JSON
let images = []; // Array per memorizzare gli oggetti delle immagini caricate

///////////////////////////////////////////// FUNZIONE PER AGGIORNARE IL DATABASE CON I VALORI ATTUALI ///////////////////////////////////////////
// updateSupabase(variableName, newValue)

function loadJson() {
  fetch("label.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((loadedJson) => {
      if (Array.isArray(loadedJson)) {
        imagesData = loadedJson;
        loadImages(); // Carica le immagini dopo aver caricato il JSON
      } else {
        console.error("Il JSON caricato non è un array.");
      }
    })
    .catch((error) => {
      console.error("Errore nel caricamento del JSON:", error);
    });
}

///////////////////////////////////////////// FUNZIONE PER IL POPOLAMENTO ARRAY///////////////////////////////////////////

function loadImages() {
  imagesData.forEach((item) => {
    let imagePath = "FINAL_RESIZED/" + item.file_name;
    let img = new Image(); // Crea un nuovo elemento immagine
    img.onload = function () {
      images.push({
        img: img,
        file_name: item.file_name,
        caption: item.caption,
        yolo_detections: item.yolo_detections,
        roboflow_detections: item.roboflow_detections,
        nude_detections: item.nude_detections,
        image_properties: item.image_properties,
        state: item.state,
      });
    };
    img.onerror = function () {
      console.error(`Impossibile caricare l'immagine: ${imagePath}`);
    };
    img.src = imagePath;
  });
}

// Chiamata alla funzione per iniziare il caricamento del JSON
loadJson();

///////////////////////////////////////////// INIZIALIZZAZIONE STATI///////////////////////////////////////////
const state = {
  STATE_IDLE: "stateIdle",
  STATE_IMAGE_PROPERTIES: "stateImageProperties",
  STATE_BOUNDING_BOXES: "stateBoundingBoxes",
  STATE_CAPTION_AND_BUTTONS: "stateCaptionAndButtons",
  STATE_FEEDBACK: "stateFeedback",
  STATE_SHUFFLING: "stateShuffling",
};

// Variabile per tenere traccia dello stato attuale
let currentState = state.STATE_IDLE;
// Indice dell'immagine corrente
let currentImageIndex = 0;

///////////////////////////////////////////// GESTIONE DELLO SWITCH CON VARIABILE PER INCREMENTARE L'INDICE DOPO IL PRIMO CICLO ///////////////////////////////////////////
let isFirstAccessToImageProperties = true;
function switchState(newState) {
  // Controllo specifico per STATE_IMAGE_PROPERTIES
  if (
    newState === state.STATE_IMAGE_PROPERTIES &&
    !isFirstAccessToImageProperties
  ) {
    // Incrementa l'indice dell'immagine, ciclando se necessario
    currentImageIndex = Math.floor(Math.random() * jsonData.length);
    // Aggiorna l'immagine visualizzata
    updateDisplayedImage();
  } else if (newState === state.STATE_IMAGE_PROPERTIES) {
    // Marca il primo accesso completato
    isFirstAccessToImageProperties = false;
  }
  currentState = newState;
  handleState();
}
function updateDisplayedImage() {
  const imgContainer = document.getElementById("img");
  if (jsonData.length > 0) {
    const imageInfo = jsonData[currentImageIndex];
    imgContainer.style.backgroundImage = `url('FINAL_RESIZED/${imageInfo.file_name}')`;
  }
}

///////////////////////////////////////////// SWITCH PER CAMBIO SCENE ///////////////////////////////////////////
function handleState() {
  switch (currentState) {
    case state.STATE_IDLE:
      updateSupabase("start", 0);
      console.log("start: ", 0);
      showImages();
      break;
    case state.STATE_IMAGE_PROPERTIES:
      updateSupabase("image_index", currentImageIndex);
      updateSupabase("safe_or_not", imgState === "safe" ? 0 : 1);
      showImageProperties();
      break;
    case state.STATE_BOUNDING_BOXES:
      showBoundingBoxes();
      break;
    case state.STATE_CAPTION_AND_BUTTONS:
      showCaptionAndButtons();
      break;
    case state.STATE_FEEDBACK:
      showFeedback();
      break;
    case state.STATE_SHUFFLING:
      shuffleImages();
      break;
  }
}

///////////////////////////////////////////// FUNZIONI DI COMPORTAMENTO PER OGNI STATO///////////////////////////////////////////

const debugElement = document.querySelectorAll("#debug");
const start_but = document.getElementById("start_but");

///////////////// PRIMA SCENA ////////////////
function showImages() {
  // Seleziona l'elemento HTML in cui verranno mostrate le immagini
  const imgContainer = document.getElementById("img");

  // Funzione per mostrare un'immagine casuale
  function displayRandomImage() {
    if (jsonData.length > 0) {
      // Scegli un indice casuale dall'array di dati JSON
      currentImageIndex = Math.floor(Math.random() * jsonData.length);
      // Ottieni i dati dell'immagine corrente
      const imageInfo = jsonData[currentImageIndex];
      // Imposta l'immagine come sfondo di imgContainer
      imgContainer.style.backgroundImage = `url('FINAL_RESIZED/${imageInfo.file_name}')`;
    }

    // Mostra l'indice dell'immagine corrente nell'elemento debug
  }

  // Mostra un'immagine casuale ogni N secondi (es. 3 secondi)
  const interval = 150; // 100ms
  const imageDisplayInterval = setInterval(displayRandomImage, interval);

  // Memorizza l'intervallo per poterlo cancellare più tardi
  window.imageDisplayInterval = imageDisplayInterval;

  // clearInterval(window.imageDisplayInterval) per fermare il ciclo quando necessario,
  // ad esempio, quando l'utente preme il bottone "Start".

  // Quando l'utente preme "Start", chiama switchState(state.STATE_IMAGE_PROPERTIES)
  start_but.addEventListener("click", function () {
    switchState(state.STATE_IMAGE_PROPERTIES);
    clearInterval(window.imageDisplayInterval);
    console.log("started");
    start_but.style.display = "none";
    updateSupabase("start", 1);
    console.log("start: ", 1);
  });
}
const metadataElement = document.getElementById("metadata");
const fileNameElement = document.createElement("p");
const propertiesElement = document.createElement("p");

///////////////// SECONDA SCENA ////////////////
function showImageProperties() {
  let imgState = jsonData[currentImageIndex].state;

  console.log("safe_or_not: ", imgState);

  // Mostra le proprietà dell'immagine corrente
  // Assicurati che l'indice dell'immagine corrente sia valido
  setTimeout(() => {
    if (currentImageIndex >= 0 && currentImageIndex < jsonData.length) {
      const { file_name, image_properties } = jsonData[currentImageIndex];

      // Svuota il contenuto precedente di metadataElement
      metadataElement.innerHTML = "";

      // Crea e aggiungi il nome del file e le proprietà dell'immagine in un unico elemento <p>
      let metadataText = `<mark>Filename: ${file_name}</mark><br><mark>Image Properties:</mark><br>`;

      // Concatena le proprietà in una singola stringa
      for (const [key, value] of Object.entries(image_properties)) {
        metadataText += `<mark>${key}: ${value}</mark><br>`; // Usa '\n' per andare a capo nel testo
      }

      // Imposta il testo concatenato come contenuto dell'elemento <p>
      // Prepara il testo per l'animazione, escludendo i tag HTML
      animateText(metadataText, metadataElement);
    }
  }, 3000);
  console.log(currentState);
}
function animateText(text, element) {
  let i = 0,
    isTag,
    textHTML = "";

  function typeWriter() {
    if (i < text.length) {
      isTag = false;

      // Completa il tag se inizia con '<' e non finisce con '>'
      if (text[i] === "<") {
        isTag = true;
        textHTML += "<";
        i++;
        while (text[i] !== ">") {
          textHTML += text[i];
          i++;
        }
        textHTML += ">";
      } else {
        textHTML += text[i];
      }

      i++;
      element.innerHTML = textHTML;

      if (isTag) {
        typeWriter();
      } else {
        setTimeout(typeWriter, 20); // Regola il tempo per modificare la velocità
      }
    } else {
      setTimeout(() => switchState(state.STATE_BOUNDING_BOXES), 2000);
    }
  }

  typeWriter();
}
///////////////// TERZA SCENA ////////////////
function showBoundingBoxes() {
  if (currentImageIndex >= 0 && currentImageIndex < jsonData.length) {
    const imgContainer = document.getElementById("img");
    // Rimuovi eventuali bounding box precedenti
    const existingBoxes = imgContainer.querySelectorAll(".bbox");
    existingBoxes.forEach((box) => box.remove());

    // Combina yolo_detections e roboflow_detections in un unico array
    const detections = [
      ...jsonData[currentImageIndex].yolo_detections.map((det) => ({
        ...det,
        type: "yolo_detection",
      })),
      ...jsonData[currentImageIndex].roboflow_detections.map((det) => ({
        ...det,
        type: "roboflow_detection",
      })),
      ...jsonData[currentImageIndex].nude_detections.map((det) => ({
        ...det,
        type: "nude_detection",
      })),
    ];

    // Funzione per mostrare la bounding box una alla volta
    function showBoundingBox(index) {
      if (index < detections.length) {
        const det = detections[index];
        createBoundingBox(imgContainer, det, det.type);

        // Attendi per un determinato periodo di tempo prima di mostrare la prossima bounding box
        setTimeout(() => showBoundingBox(index + 1), 100); // Modifica il tempo di attesa se necessario
      } else {
        // Una volta che tutte le bounding box sono state mostrate, procedi al passaggio successivo
        propertiesElement.innerHTML = "";
        metadataElement.innerHTML = "";
        console.log(currentState);
        // Dopo un certo periodo, passa al prossimo stato
        setTimeout(() => switchState(state.STATE_CAPTION_AND_BUTTONS), 5000); // Modifica il tempo di attesa se necessario
      }
    }

    // Inizia a mostrare le bounding box dalla prima
    showBoundingBox(0);
  }
}

// Funzione helper per creare e aggiungere i bounding box
function createBoundingBox(container, det, detectionType) {
  // Assicurati che le dimensioni originali siano accessibili
  const imageInfo = jsonData[currentImageIndex]; // Assumi che questa variabile sia accessibile
  const dimensions = imageInfo.image_properties.dimensions; // "1080x1072"
  const [originalWidth, originalHeight] = dimensions.split("x").map(Number);
  const { width: displayedWidth, height: displayedHeight } =
    container.getBoundingClientRect();

  const scaleX = displayedWidth / originalWidth;
  const scaleY = displayedHeight / originalHeight;

  const bboxDiv = document.createElement("div");
  bboxDiv.classList.add("bbox", detectionType); // Usa classi per applicare stili CSS
  bboxDiv.style.left = `${det.bbox[0] * scaleX}px`;
  bboxDiv.style.top = `${det.bbox[1] * scaleY}px`;
  bboxDiv.style.width = `${(det.bbox[2] - det.bbox[0]) * scaleX}px`;
  bboxDiv.style.height = `${(det.bbox[3] - det.bbox[1]) * scaleY}px`;
  bboxDiv.style.boxSizing = "border-box";

  // Crea un elemento per il testo con class_name e confidence
  const textDiv = document.createElement("div");
  textDiv.textContent = `${det.class_name} (${(det.confidence * 100).toFixed(
    1
  )}%)`;
  textDiv.style.position = "absolute";
  textDiv.style.left = "-3px";
  textDiv.style.top = "-26px";
  textDiv.style.padding = "2px 5px";
  textDiv.style.fontSize = "18px";
  textDiv.style.color = "Black";

  // Scegli il colore dello sfondo basato sul tipo di detection
  let backgroundColor;
  switch (detectionType) {
    case "yolo_detection":
      backgroundColor = "rgb(128, 255, 0)"; // colore del bordo per yolo_detections
      break;
    case "roboflow_detection":
      backgroundColor = "rgb(138, 20, 255)"; // colore del bordo per roboflow_detections
      break;
    case "nude_detection":
      backgroundColor = "rgb(254, 1, 86)"; // colore del bordo per nude_detections
      break;
    default:
      backgroundColor = "rgba(0,0,0,0.5)"; // Colore di default nel caso non sia né yolo né roboflow
  }
  textDiv.style.backgroundColor = backgroundColor;

  // Aggiungi il div del testo alla bounding box
  bboxDiv.appendChild(textDiv);

  container.appendChild(bboxDiv);
}
///////////////// QUARTA SCENA ////////////////
function showCaptionAndButtons() {
  console.log(currentState);
  removeBoundingBoxes();
  console.log("Tutti i bounding box sono stati rimossi.");

  const caption = jsonData[currentImageIndex].caption;
  const feedbackElement = document.getElementById("feedback");
  feedbackElement.innerHTML = ""; // Pulisce il contenuto precedente

  const captionElement = document.createElement("p");
  captionElement.innerHTML = "<mark>" + "Caption:<br>" + "</mark>";
  feedbackElement.appendChild(captionElement);

  function typeWriter(text, index, callback) {
    if (index < text.length) {
      captionElement.innerHTML += "<mark>" + text.charAt(index) + "</mark>";
      index++;
      setTimeout(function () {
        typeWriter(text, index, callback);
      }, 20); // Regola questo valore per aumentare o diminuire la velocità di digitazione
    } else if (callback) {
      callback(); // Chiama la funzione callback dopo aver finito di scrivere la caption
    }
  }

  // Avvia l'animazione della caption e poi aggiusta la posizione dei bottoni
  typeWriter(caption, 0, function () {
    captionElement.innerHTML += "<mark>" + "<br>State:" + "<mark>"; // Aggiunge "Stato:" alla fine della caption
    adjustButtonPositions(); // Aggiusta la posizione dei bottoni come prima
  });
  function adjustButtonPositions() {
    // Aggiusta la posizione dei bottoni basandoti sull'altezza della caption
    const safeButton = document.getElementById("safe_but");
    const notSafeButton = document.getElementById("not_safe_but");

    safeButton.removeEventListener("click", handleButtonClick);
    notSafeButton.removeEventListener("click", handleButtonClick);
    safeButton.addEventListener("click", handleButtonClick);
    notSafeButton.addEventListener("click", handleButtonClick);
    safeButton.style.display = "block";
    notSafeButton.style.display = "block";
  }

  function handleButtonClick() {
    feedbackElement.innerHTML = "";
    switchState("STATE_SHOW_IMAGES");
    showFeedback();
    const safeButton = document.getElementById("safe_but");
    const notSafeButton = document.getElementById("not_safe_but");
    safeButton.style.display = "none";
    notSafeButton.style.display = "none";
  }
}
///////////////// NUOVA SCENA XDLOL - QUINTA SCENA////////////////
function showFeedback() {
  const imageState = jsonData[currentImageIndex].state;
  const imageDiv = document.getElementById("imgState"); // Modificato per puntare a #imgState
  const imageEyeDiv = document.getElementById("imgStateEye");
  imageEyeDiv.innerHTML = ""; // Pulisce il contenuto precedente dell'elemento interno

  // Crea l'elemento immagine una volta
  const imageElement = document.createElement("img");
  imageElement.src =
    imageState === "safe" ? "assets/safe.png" : "assets/not_safe.png";
  imageEyeDiv.appendChild(imageElement);

  // Mostra il div e centra l'immagine
  imageDiv.style.display = "block";

  // Imposta un timer per nascondere l'immagine dopo 2 secondi
  setTimeout(() => {
    imageDiv.style.display = "none";
  }, 4000);

  // Opzionale: Passa allo stato successivo dopo un ritardo
  // Se vuoi che questa azione avvenga indipendentemente dal display dell'immagine,
  // considera di aggiustare il tempo di attesa o spostare questa logica altrove.
  setTimeout(() => switchState(state.STATE_SHUFFLING), 5000);
}

function shuffleImages() {
  console.log("Shuffling images...");
  const imgContainer = document.getElementById("img");

  // const debugElement = document.getElementById("debug"); // Correzione qui
  if (window.imageDisplayInterval) {
    clearInterval(window.imageDisplayInterval);
  }
  // Funzione per mostrare un'immagine casuale
  function displayRandomImage() {
    if (jsonData.length > 0) {
      // Scegli un indice casuale dall'array di dati JSON
      currentImageIndex = Math.floor(Math.random() * jsonData.length);
      // Ottieni i dati dell'immagine corrente
      const imageInfo = jsonData[currentImageIndex];
      // Imposta l'immagine come sfondo di imgContainer
      imgContainer.style.backgroundImage = `url('FINAL_RESIZED/${imageInfo.file_name}')`;
    }
    // Mostra l'indice dell'immagine corrente nell'elemento debug
    // debugElement.innerHTML = `<mark>Current Image Index: ${currentImageIndex}</mark>`;
  }

  const interval = 150; // 100ms
  window.imageDisplayInterval = setInterval(displayRandomImage, interval);

  // Termina lo shuffling dopo un certo periodo
  setTimeout(() => {
    clearInterval(window.imageDisplayInterval);
    switchState(state.STATE_IMAGE_PROPERTIES);
  }, 2000);
}

///////////////////////////////////////////////// FUNZIONI DI GESTIONE ////////////////////////////////////////////////
function removeBoundingBoxes() {
  const imgContainer = document.getElementById("img");
  const existingBoxes = imgContainer.querySelectorAll(".bbox");
  existingBoxes.forEach((box) => box.remove());
}
// Inizializzazione
function init() {
  // Carica i dati JSON e inizia a mostrare le immagini
  loadJsonData().then(() => {
    handleState();
  });
}

// Funzione per caricare i dati JSON
async function loadJsonData() {
  // Usa fetch() o un'altra tecnica per caricare i tuoi dati JSON in jsonData
  jsonData = await fetch("label.json").then((response) => response.json());
}

init();
///////////////////////////////////////////////// ////////////////////////////////////////////////
