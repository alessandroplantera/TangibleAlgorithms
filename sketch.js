const button_start = document.createElement("button");

let imagesData; // Questo conterrà i dati JSON
let images = []; // Array per memorizzare le immagini pre-caricate e i dati associati

//bbox
// Variabili per il controllo del flusso dei bounding box e dei tipi di detection
let detectionTypes = ["yolo_detections", "roboflow_detections"];
let currentDetectionIndex = 0; // Indice per alternare tra YOLO e Roboflow
let currentBboxIndex = -1;
let detectionQueue = []; // Coda per tenere traccia di tutti i bounding box da disegnare

let allDetections = []; // Array per memorizzare tutti i bounding box e i loro tipi
let lastBboxDrawTime = 0;
const bboxDrawInterval = 250;
let postDrawDelayStarted = false;
let postDrawDelayTime = 2000;
let detectionsDrawn = false; // Indica se tutti i bounding box sono stati disegnati

//SafeOrNot
let buttonSafe, buttonNotSafe;
let imgStateFlag = false; // Flag to track if console log has been shown

//STATI
let state_idle = 0;
let state_metadata_show = 1;
let state_bounding = 2;
//stateboundingdone(?)
let state_dialog = 3;

//MAIN STATE VARIABLES
let current_state = state_idle;
let currentImageIndex_state = -1;
let currentIndex = 0; // Indice per tenere traccia dell'immagine corrente da visualizzare

// TIME FLAG PER IL TESTO
let showText = false; // Variabile globale per controllare la visualizzazione del testo
let timestamp = 0; // Memorizza il momento in cui l'immagine viene mostrata
let state_change_delay = 2000; // Ritardo prima di cambiare stato (2 secondi)
let properties_display_duration = 5000; // Durata per cui le proprietà rimangono visualizzate prima di cambiare stato

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
}

function setup() {
  createCanvas(834, 1194);
  colorMode(RGB, 255);
  //frameRate(1); // Regola secondo necessità

  if (current_state == state_idle) {
    let button_start = createButton("Start");
    button_start.position(
      width / 2 - button_start.width,
      height - button_start.height * 2
    );
    button_start.mousePressed(() => {
      current_state = state_metadata_show;
    });
  }
}

function draw() {
  background(220);
  if (current_state == state_idle) {
    showSequentialImages();
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
  stroke(detectionType === "yolo_detections" ? [0, 255, 0] : [0, 0, 255]);
  strokeWeight(4);
  fill(detectionType === "yolo_detections" ? [0, 255, 0, 60] : [0, 0, 255, 60]); // Opzionale: semi-trasparente
  rect(bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
  fill(255); // Colore bianco per il testo
  noStroke();
  textSize(16);
  text(`${className}: ${confidence.toFixed(2)}`, bbox[0], bbox[1] - 10);
}

function showDialog() {
  let imgObj = images[currentIndex].img;
  let imgState = images[currentIndex].state;
  image(imgObj, 0, 0, width, height);
  let imgCaption = images[currentIndex].caption;

  fill(0, 0, 0, 120);
  rect(0, 0, width, height);
  noFill();
  // Add caption Title
  fill(255); // White color
  noStroke();
  textSize(20);
  textAlign(CENTER, CENTER);
  text("caption", 130, 468);
  textAlign(LEFT, CENTER);
  textSize(30);
  textLeading(30);
  let captionWidth = width - 200; // Larghezza della didascalia (canvas width - 100px da entrambi i lati)
  text(imgCaption, 100, 560, captionWidth);
  // Posiziona i bottoni in base alla larghezza del canvas e desiderata distanza dal testo
  let buttonY = 640; // Ad esempio, posiziona i bottoni un po' sotto al testo
  image(buttonSafe, 100, buttonY); // Posiziona il primo bottone
  image(buttonNotSafe, width - 350, buttonY); // Posiziona il secondo bottone

  // Controlla se l'immagine corrente è safe o not safe
  if (imgState === "safe" && !imgStateFlag) {
    console.log("Safe");
    currentImageIndex_state = 0;
    updateSupabase(true);
    imgStateFlag = true; // Set the flag to true after showing console log
  } else if (imgState === "not_safe" && !imgStateFlag) {
    console.log("Not Safe");
    currentImageIndex_state = 1;
    updateSupabase(false);
    imgStateFlag = true; // Set the flag to true after showing console log
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
      current_state = state_metadata_show;
      currentIndex = Math.floor(Math.random() * images.length);
    }
    // Controlla se il click è avvenuto sul bottone "not safe"
    else if (
      mouseX >= width - 350 &&
      mouseX <= width - 350 + buttonNotSafe.width &&
      mouseY >= buttonY &&
      mouseY <= buttonY + buttonNotSafe.height
    ) {
      current_state = state_metadata_show;
      currentIndex = Math.floor(Math.random() * images.length);
      console.log(currentImageIndex_state);
      console.log("Not Safe button clicked");
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
