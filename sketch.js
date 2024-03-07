const button_start = document.createElement("button");

let imagesData; // Questo conterrà i dati JSON
let images = []; // Array per memorizzare le immagini pre-caricate e i dati associati

// BBOX
// Variabili per il controllo del flusso dei bounding box e dei tipi di detection
let detectionTypes = ["yolo_detections", "roboflow_detections"];
let currentDetectionIndex = 0; // Indice per alternare tra YOLO e Roboflow
let currentBboxIndex = -1;
let detectionQueue = []; // Coda per tenere traccia di tutti i bounding box da disegnare

// TIME FLAG PER I BOUNDING BOX
let allDetections = []; // Array per memorizzare tutti i bounding box e i loro tipi
let lastBboxDrawTime = 0;
const bboxDrawInterval = 250;
let postDrawDelayStarted = false;
let postDrawDelayTime = 5000;
let detectionsDrawn = false; // Indica se tutti i bounding box sono stati disegnati

// SAFE OR NOT
let buttonSafe, buttonNotSafe;
let imgStateFlag = false; // Flag to track if console log has been shown

// FEEDBACK
let feedBackSafe, feedBackNotsafe;
let startTime = -1; // Imposta a -1 per indicare che il timer non è attivo

// STATI
let state_idle = 0;
let state_metadata_show = 1;
let state_bounding = 2;
//stateboundingdone(?)
let state_dialog = 3;
let state_feedback = 4;

// MAIN STATE VARIABLES
let current_state = state_idle;
let currentImageIndex_state = -1;
let currentIndex = 0; // Indice per tenere traccia dell'immagine corrente da visualizzare

// TIME FLAG PER IL TESTO
let showText = false; // Variabile globale per controllare la visualizzazione del testo
let timestamp = 0; // Memorizza il momento in cui l'immagine viene mostrata
let state_change_delay = 2000; // Ritardo prima di cambiare stato (2 secondi)
let properties_display_duration = 10000; // Durata per cui le proprietà rimangono visualizzate prima di cambiare stato

function preload() {
  loadJSON("label.json", function (loadedJson) {
    if (Array.isArray(loadedJson)) {
      imagesData = loadedJson;
      imagesData.forEach((item, index) => {
        let imagePath = "dataset_upd/" + item.file_name;
        loadImage(imagePath, function (img) {
          if (img) {
            images.push({
              img: img,
              file_name: item.file_name,
              caption: item.caption,
              yolo_detections: item.yolo_detections,
              roboflow_detections: item.roboflow_detections,
              image_properties: item.image_properties,
              state: item.state,
            });
          } else {
            console.error(`Impossibile caricare l'immagine: ${imagePath}`);
          }
        });
      });
    } else {
      console.error("Il JSON caricato non è un array.");
    }
  });
  buttonSafe = loadImage("assets/safe.png");
  buttonNotSafe = loadImage("assets/not_safe.png");
  feedBackSafe = loadImage("assets/feedbackSafe.png");
  feedBackNotsafe = loadImage("assets/feedbackNotsafe.png");
  buttonStart = loadImage("assets/button_start.png");
  font = loadFont("assets/IBMPlexMono-Light.ttf");
  fontMedium = loadFont("assets/IBMPlexMono-Medium.ttf");
}

function setup() {
  createCanvas(834, 1194);
  colorMode(RGB, 255);
  updateSupabase("start", 0);
  //frameRate(1); // Regola secondo necessità
}

let lastProcessedIndex = -1; // Inizializza con un valore che non corrisponderà mai a un indice valido
function draw() {
  background(220);
  if (current_state == state_idle) {
    showSequentialImages();
    image(
      buttonStart,
      width / 2 - buttonStart.width / 2,
      height / 2 - buttonStart.height / 2
    );
  }
  if (current_state == state_metadata_show) {
    showMetadata();
  }

  if (current_state == state_bounding) {
    showBoundingBoxes();
  }
  if (current_state == state_dialog) {
    showDialog();
  }
  if (current_state == state_feedback) {
    showFeedback();
  }

  let imgState = images[currentIndex].state;
  // Controlla se l'indice dell'immagine è cambiato
  if (!current_state == state_idle) {
    if (currentIndex !== lastProcessedIndex) {
      // Il blocco di codice qui verrà eseguito solo quando l'indice dell'immagine cambia
      if (imgState === "safe") {
        console.log("L'immagine è safe.");
        currentImageIndex_state = 0;
      } else if (imgState === "not_safe") {
        console.log("L'immagine è not safe.");
        currentImageIndex_state = 1;
      }
      updateSupabase("safe_or_not", currentImageIndex_state);
      console.log("percorso " + currentImageIndex_state + " iniziato");
      // Aggiorna la flag e l'ultimo indice processato
      imgStateFlag = true;
      lastProcessedIndex = currentIndex;
    }
  }

  //updateSupabase("image_index", currentIndex);
  //updateSupabase("safe_or_not", currentImageIndex_state);
}

// Main Functions
//    Idle State managing
function showSequentialImages() {
  // Controlla se ci sono immagini e se l'indice corrente è valido
  if (images.length > 0 && currentIndex < images.length) {
    let imgObj = images[currentIndex].img;
    image(imgObj, 0, 0, width, height);
    fill(255);
    noStroke();
    textSize(16);
    // Aggiunta di una logica per incrementare l'indice e resettarlo se necessario
    currentIndex++;
    // console.log(currentIndex);
    if (currentIndex >= images.length) {
      currentIndex = 0; // Resettare l'indice per ricominciare dall'inizio
    }
  }
}

//    Safe State managing
function showMetadata() {
  if (images.length > 0 && imagesData) {
    let imgData = images[currentIndex];
    let imgObj = images[currentIndex].img;
    image(imgObj, 0, 0, width, height);
    fill(0, 0, 0, 80);
    rect(0, 0, width, height);
    noFill();
    let currentTime = millis();
    if (timestamp === 0) {
      timestamp = currentTime; // Imposta il timestamp se è la prima volta
    }

    let typingSpeed = 5; // Velocità di "digitazione" in millisecondi per lettera

    if (
      currentTime - timestamp > state_change_delay &&
      currentTime - timestamp < properties_display_duration
    ) {
      let yPos = 40; // Posizione di inizio per il testo sul canvas
      textFont(font);
      fill(255); // Colore del testo
      noStroke();

      // Calcola il numero di lettere da mostrare in base al tempo trascorso
      let elapsed = currentTime - timestamp - state_change_delay;
      let lettersToShow = Math.floor(elapsed / typingSpeed);

      // Funzione per ottenere il testo "animato"
      function animatedText(fullText, x, y, maxLetters) {
        text(fullText.substring(0, maxLetters), x, y);
      }

      // Nome immagine
      let imgNameText = `Nome immagine: ${imgData.file_name}`;
      textSize(22);
      if (lettersToShow > imgNameText.length) {
        lettersToShow -= imgNameText.length;
      } else {
        imgNameText = imgNameText.substring(0, lettersToShow);
        lettersToShow = 0;
      }
      text(imgNameText, 10, yPos);
      yPos += 21;

      if (lettersToShow > 0) {
        let propertiesText = "Proprietà immagine:";
        textSize(18);
        if (lettersToShow > propertiesText.length) {
          lettersToShow -= propertiesText.length;
        } else {
          propertiesText = propertiesText.substring(0, lettersToShow);
          lettersToShow = 0;
        }
        text(propertiesText, 10, yPos + 80);
        yPos += 21;

        Object.keys(imgData.image_properties).forEach((key) => {
          textSize(18);
          if (lettersToShow > 0) {
            let propText = `${key}: ${imgData.image_properties[key]}`;
            if (lettersToShow > propText.length) {
              lettersToShow -= propText.length;
            } else {
              propText = propText.substring(0, lettersToShow);
              lettersToShow = 0;
            }
            text(propText, 50, yPos + 80);
            yPos += 21;
          }
        });
      }
    } else if (currentTime - timestamp > properties_display_duration) {
      current_state = state_bounding;
      timestamp = 0; // Resetta il timestamp per il prossimo ciclo
    }
  }
}

function showMetadataOnlyText() {
  let imgData = images[currentIndex];
  let currentTime = millis();
  if (timestamp === 0) {
    // Se è la prima volta, imposta il timestamp
    timestamp = currentTime;
  }
  // Controlla se sono trascorsi 2 secondi per mostrare le proprietà
  if (
    currentTime - timestamp > state_change_delay &&
    currentTime - timestamp < properties_display_duration
  ) {
    let yPos = 40; // Posizione di inizio per il testo sul canvas
    fill(255); // Colore del testo
    noStroke();
    textSize(22);
    text(`Nome immagine: ${imgData.file_name}`, 10, yPos);
    yPos += 30;
    text(`Proprietà immagine:`, 10, yPos);
    yPos += 30;
    Object.keys(imgData.image_properties).forEach((key) => {
      text(`${key}: ${imgData.image_properties[key]}`, 20, yPos);
      yPos += 30;
    });
  } else if (currentTime - timestamp > properties_display_duration) {
    // Cambia lo stato dopo che le proprietà sono state mostrate per un certo tempo
    current_state = state_bounding;
    timestamp = 0; // Resetta il timestamp per il prossimo ciclo
  }
}

function setupDetectionQueue() {
  let itemData = images[currentIndex];
  detectionTypes.forEach((detectionType) => {
    let detections = itemData[detectionType] || [];
    detections.forEach((det) => allDetections.push({ det, detectionType }));
  });
}

function showBoundingBoxes() {
  let currentTime = millis();
  let imgObj = images[currentIndex].img;
  image(imgObj, 0, 0, width, height);
  fill(0, 0, 0, 80);
  rect(0, 0, width, height);
  noFill();
  // Se non abbiamo ancora iniziato a disegnare, inizializziamo
  if (allDetections.length === 0 && !detectionsDrawn) {
    setupDetectionQueue();
    lastBboxDrawTime = currentTime; // Resetta il tempo per il primo disegno
  }

  // Se è il momento di disegnare un nuovo bounding box
  if (
    !detectionsDrawn &&
    currentTime - lastBboxDrawTime >= bboxDrawInterval &&
    allDetections.length > 0
  ) {
    lastBboxDrawTime = currentTime;
    // Aumenta l'indice di disegno fino a quando non abbiamo disegnato tutti
    if (!detectionsDrawn) {
      currentBboxIndex++;
      if (currentBboxIndex >= allDetections.length) {
        detectionsDrawn = true;
        lastBboxDrawTime = currentTime; // Inizia il conteggio del ritardo dopo l'ultimo bbox
      }
    }
  }

  // Ridisegna tutti i bounding box disegnati finora
  for (let i = 0; i < currentBboxIndex; i++) {
    let { det, detectionType } = allDetections[i];
    drawDetection(det, detectionType);
  }

  // Dopo aver disegnato l'ultimo bounding box, attendi 2 secondi prima di cambiare lo stato
  if (detectionsDrawn && currentTime - lastBboxDrawTime >= postDrawDelayTime) {
    // Cambia lo stato in 'dialog'
    current_state = state_dialog;
    // Reset per il prossimo ciclo
    allDetections = [];
    detectionsDrawn = false;
    currentBboxIndex = 0;
    postDrawDelayStarted = false;
  }
}

function drawDetection(det, detectionType) {
  let bbox = det.bbox;
  let className = det.class_name;
  let confidence = det.confidence;

  stroke(detectionType === "yolo_detections" ? [180, 255, 0] : [254, 1, 86]);
  strokeWeight(4);
  fill(
    detectionType === "yolo_detections" ? [180, 255, 0, 30] : [254, 1, 86, 30]
  );

  rect(bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
  textFont(fontMedium);
  textSize(16);
  let textStr = `${className}: ${confidence.toFixed(2)}`;
  let textWidthVal = textWidth(textStr);

  fill(detectionType === "yolo_detections" ? [180, 255, 0] : [254, 1, 86]);
  noStroke();
  rect(bbox[0] - 2, bbox[1] - 22, textWidthVal + 4, 24);

  fill(0); // Colore del testo a nero
  // Sostituisci il calcolo di textY con un valore fisso appropriato
  let textY = bbox[1] - 22; // Regola questo valore per centrare il testo nel tuo rettangolo
  let textX = textStr + 4;
  // console.log("ciao");
  text(textX, bbox[0] - 2, textY);
}

function showDialog() {
  updateSupabase("current_state", 3);
  let imgObj = images[currentIndex].img;
  let imgCaption = images[currentIndex].caption;
  image(imgObj, 0, 0, width, height);
  // Utilizza showDialogTimestampInitialized per inizializzare solo una volta
  if (!showDialogTimestampInitialized) {
    timestamp = millis(); // Solo la prima volta
    showDialogTimestampInitialized = true;
  }
  let typingSpeed = 10; // Velocità di digitazione in millisecondi per lettera
  fill(0, 0, 0, 120);
  rect(0, 0, width, height);
  fill(255);
  // Add caption Title
  textFont(font);
  fill(255); // White color
  noStroke();
  textSize(18);
  textAlign(LEFT, TOP);
  text("Caption", 10, 120);
  noStroke();
  textSize(18);
  textAlign(LEFT, TOP);
  textLeading(21);
  let captionWidth = width - 250;

  let currentTime = millis();
  let elapsed = currentTime - timestamp;
  let lettersToShow = Math.floor(elapsed / typingSpeed);
  let textToShow = imgCaption.substring(0, lettersToShow);
  text(textToShow, 50, 141, captionWidth); // Mostra il testo animato

  // Mostra i bottoni solo dopo che il testo è stato completamente visualizzato
  if (lettersToShow >= imgCaption.length) {
    let buttonY = 640;
    image(buttonSafe, 100, buttonY); // Posiziona il primo bottone
    image(buttonNotSafe, width - 300, buttonY); // Posiziona il secondo bottone
  }
}
function showFeedback() {
  // Controlla se il timer non è stato ancora impostato
  if (startTime < 0) {
    startTime = millis(); // Imposta il timer
  }
  let duration = 2000; // 2 seconds
  let currentTime = millis();

  if (currentImageIndex_state == 0) {
    let imgObj = images[currentIndex].img;
    image(imgObj, 0, 0, width, height);
    fill(0, 0, 0, 80);
    rect(0, 0, width, height);
    noFill();
    image(
      feedBackSafe,
      width / 2 - feedBackSafe.width / 2,
      height / 2 - feedBackSafe.height / 2
    );
    if (millis() - startTime >= duration) {
      current_state = state_metadata_show;
      currentIndex = Math.floor(Math.random() * images.length);
    }
  } else {
    let imgObj = images[currentIndex].img;
    image(imgObj, 0, 0, width, height);
    fill(0, 0, 0, 80);
    rect(0, 0, width, height);
    noFill();
    image(
      feedBackNotsafe,
      width / 2 - feedBackSafe.width / 2,
      height / 2 - feedBackSafe.height / 2
    );
    if (millis() - startTime >= duration) {
      current_state = state_metadata_show;
      currentIndex = Math.floor(Math.random() * images.length);
    }
  }
  // Controlla se sono passati 2 secondi
  if (currentTime - startTime >= duration) {
    current_state = state_metadata_show;
    currentIndex = Math.floor(Math.random() * images.length);
    startTime = -1; // Resetta startTime per permettere al timer di essere riavviato in futuro
  }
}

// Supplemental Functions
function mousePressed() {
  if (current_state == state_dialog) {
    let buttonY = 640;
    // Controlla se il click è avvenuto sul bottone "safe"
    if (
      mouseX >= 100 &&
      mouseX <= 100 + buttonSafe.width &&
      mouseY >= buttonY &&
      mouseY <= buttonY + buttonSafe.height
    ) {
      console.log("Safe button clicked");
      console.log(currentImageIndex_state);
      current_state = state_feedback;
      // currentIndex = Math.floor(Math.random() * images.length);
    }
    // Controlla se il click è avvenuto sul bottone "not safe"
    else if (
      mouseX >= width - 300 &&
      mouseX <= width - 300 + buttonNotSafe.width &&
      mouseY >= buttonY &&
      mouseY <= buttonY + buttonNotSafe.height
    ) {
      current_state = state_feedback;
      console.log(currentImageIndex_state);
      console.log("Not Safe button clicked");
      // currentIndex = Math.floor(Math.random() * images.length);
    }
  }

  if (current_state == state_idle) {
    if (
      mouseX >= width / 2 - buttonStart.width / 2 &&
      mouseX <= width / 2 + buttonStart.width / 2 &&
      mouseY >= height / 2 - buttonStart.height / 2 &&
      mouseY <= height / 2 + buttonStart.height / 2
    ) {
      updateSupabase("start", 1);
      console.log("Safe button clicked");
      console.log(currentImageIndex_state);
      current_state = state_metadata_show;
      currentIndex = Math.floor(Math.random() * images.length);
      showDialogTimestampInitialized = false;
      timestamp = 0;
    }
  }
}

// Full screen management
function keyPressed() {
  if (key === "f" || key === "F") {
    let fs = fullscreen(); // Controlla lo stato attuale della modalità a schermo intero
    fullscreen(!fs); // Attiva/disattiva la modalità a schermo intero
  }
}
