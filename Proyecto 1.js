import { Chess } from 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.min.js';
/* Carga de Chess.js para agregar movimientos legales
<!-- Carga problematica debido a problema de politicas CORS del navegador solucionado hosteando el propio server
con live-server */
var board = null; // Inicializando tablero
var game = new Chess(); // Creando un nuevo game de Chess.js
var $board = $('#myBoard');
var whiteSquareGrey = '#a9a9a9'; // Colores para jugadas disponibles
var blackSquareGrey = '#696969';
var squareToHighlight = null; // Inicializacion de Highlights
var lastMoveSource = null; // Objetivos de Highlighteo
var lastMoveTarget = null;
var juegoIniciado = false;

// Funciones de Movimientos y Estilo
function highlights(source,target){
  if (game.turn() === 'w') {
    // highlight black's move
    removeHighlights('black')
    $board.find('.square-' + source).addClass('highlight-black')
    $board.find('.square-' + target).addClass('highlight-black')
  }else{
    // highlight white's move
    removeHighlights('white')
    $board.find('.square-' + source).addClass('highlight-white')
    $board.find('.square-' + target).addClass('highlight-white')
  }
}

function onDragStart (source, piece, position, orientation) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false

  // only pick up pieces for the side to move
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
  }
}

// Eliminacion de Highlights del tablero
function removeHighlights (color) {
  $board.find('.' + 'square-55d63')
    .removeClass('highlight-' + color)
}

let hardSaltoOnChange = false;

function onDrop (source, target) {

  juegoIniciado = true; // Cambiamos el estado de juego a iniciado
  removeGreySquares();
  let prom = 'q'; // default promote to a queen
  const posicion = board.position();

  // Si la pieza a mover es un peon en posicion de coronacion
  if ((posicion[source] === 'wP' && source[1] === '7') || (posicion[source] === 'bP' && source[1] === '2')){
      // Ver si esta en la lista de movimientos legales antes de la eleccion
      const possibleMoves = game.moves({ square: source, verbose: true });
      if (possibleMoves.find(move => move.to === target)){
        hardSaltoOnChange = true; /* Activamos el hardsaltoOnChange antes de la funcion asyncrona ya que si dejamos
        este paso para despues la funcion onChange ya se ve ejecutada antes que la asyncrona */
        console.log("activada coronacion");
        manejarPromocion(source, target,function(prom){
        onDropFinish(source, target, prom); // Llamamos a onDropFinish después de elegir la pieza
        board.position(game.fen());
        });
        return;
      }
  }
  // Detectar movimientos especiales, movimientos que se hacen en 2 partes y no deben activar 2 veces onChange
  let move = onDropFinish(source,target,prom); // Recibimos move para analizar
  if (move !== 'snapback' && (move.flags.includes('k') || move.flags.includes('q') || move.flags.includes('p') || move.flags.includes('e'))){
    saltoOnChange = true; // Si es un movimiento especial, activar la bandera de salto
  }
  console.log(game.turn());
  stockfishMove(); // Analizamos si esta activo el juego vs ccomputadora y ejeccuta el movimiento
  autoRotacion(); // Analizamos si esta activa la rotacion automatica
}

// Manejo de la promocion
function manejarPromocion(source, target, callback){
  showPromotionMenu(function(piezaElegida){ // Abrimos el menú de selección
    let prom = piezaElegida || 'q';
    callback(prom);
  });
}

// Funcion para terminar el onDrop tanto para coronaciones como cualquier otro movimiento
function onDropFinish(source,target,prom){
  var move = game.move({
    from: source,
    to: target,
    promotion: prom
  });
  // Movimiento ilegal
  if (move === null){
    console.log("snapback");
    return 'snapback';
  }
  hardSaltoOnChange = false;


  // Actualizar estado del último movimiento
  lastMoveSource = source;
  lastMoveTarget = target;

  highlights(source, target);
  updateStatus();

  return move;
}


// Función para mostrar el menú de promoción

function showPromotionMenu(callback){
  let turn = game.turn(); // Devolvera 'w' o 'b'
  let rutaImgQ = `img/chesspieces/wikipedia/${turn}Q.png`;
  let rutaImgR = `img/chesspieces/wikipedia/${turn}R.png`;
  let rutaImgN = `img/chesspieces/wikipedia/${turn}N.png`;
  let rutaImgB = `img/chesspieces/wikipedia/${turn}B.png`;
  Swal.fire({
    title: 'Elige una opción',
    text: 'Selecciona una de las imágenes:',
    showCancelButton: false,
    showConfirmButton: false,
    html:
      `<div style="display: flex; justify-content: space-between;">
        <button id="option1" style="border: none; background: none;">
          <img src="${rutaImgQ}" alt="Reina" width="100" height="100">
        </button>
        <button id="option2" style="border: none; background: none;">
          <img src="${rutaImgR}" alt="Torre" width="100" height="100">
        </button>
        <button id="option3" style="border: none; background: none;">
          <img src="${rutaImgN}" alt="Caballo" width="100" height="100">
        </button>
        <button id="option4" style="border: none; background: none;">
          <img src="${rutaImgB}" alt="Alfil" width="100" height="100">
        </button>
      </div>`,
    didOpen: () => {
      console.log("Menú abierto, esperando elección");
      document.querySelector('#option1').addEventListener('click', () => {
        console.log("Reina seleccionada");
        callback('q');
        Swal.close(); // Cierra el diálogo después de seleccionar
      });
      document.querySelector('#option2').addEventListener('click', () => {
        console.log("Torre seleccionada");
        callback('r');
        Swal.close();
      });
      document.querySelector('#option3').addEventListener('click', () => {
        console.log("Caballo seleccionado");
        callback('n');
        Swal.close();
      });
      document.querySelector('#option4').addEventListener('click', () => {
        console.log("Alfil seleccionado");
        callback('b');
        Swal.close();
      });
    }
  });
}

function onSnapEnd () {
  board.position(game.fen())
}

function updateStatus () {
  var status = ''
  var moveColor = 'White'
  if (game.turn() === 'b') {
    moveColor = 'Black'
  }
  // checkmate?
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.'
  }
  // draw?
  else if (game.in_draw()) {
    status = 'Game over, drawn position'
  }
  // game still on
  else {
    status = moveColor + ' to move'
    // check?
    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check'
    }
  }
}

// Remueve el background gris de todas la casillas
function removeGreySquares () {
  $('#myBoard .square-55d63').css('background', '')
}

function greySquare (square) {
  var $square = $('#myBoard .square-' + square)
  var background = whiteSquareGrey
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey
  }
  $square.css('background', background)
}

function onMouseoverSquare (square, piece) {
  // get list of possible moves for this square
  var moves = game.moves({
    square: square,
    verbose: true
  })
  // exit if there are no moves available for this square
    if (moves.length === 0) return

    // highlight the square they moused over
    greySquare(square)

    // highlight the possible squares for this piece
    for (var i = 0; i < moves.length; i++) {
      greySquare(moves[i].to)
    }
}

// Saliendo del MouseHover de la casilla borrar las posibles jugadas
function onMouseoutSquare (square, piece) {
  removeGreySquares()
}

// Funciones de guardado y Botones

var contadorAuxiliardePartidas = 1; // Cantidad de Partidas para fast save unico
let partidaActual = []; // Array de jugadas
var $botonGuardado = $('#botonGuardado');
var $botonGuardadoComo = $('#botonGuardadoComo');
var $botonCargarGame = $('#botonCargarGame');
var $botonAtras = $('#botonAtras');
var $botonAdelante = $('#botonAdelante');
var turnoActual = 0; // Index de jugadas del array
let nombrePartida = "";
var saltoOnChange = false; // Bandera para evitar avances en carga de partidas

// Objeto de jugadas inicializado
partidaActual[0] = {
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  nombre: "Partida nro: " + contadorAuxiliardePartidas,
  firstSave: true, // Bandera para poder hacer fast saves
  movimientos: [] // Guarda movimientos de la partida para que no se pierdan cuando se cargan los games
}

// Cambiar nombre a todos los elementos del array
function asignarNombre(array,nombre){
  for (const elemento of array){
    elemento.nombre = nombre
  }
}

// Cambiar estado de bandera de guardado para todo el array
function cambiarGuardado(array,booleano){
  for (const elemento of array){
    elemento.firstSave = booleano
  }
}

// Sobreescribe json guardado para mismo nombre y pide info para guardar si es slow save
function saveGame (){
  localStorage.removeItem(partidaActual[0].nombre);
  if(partidaActual[partidaActual.length - 1].firstSave){ // Si es slow save pide nombre para guardado
      nombrePartida = prompt("Ingrese nombre de partida")
      if(nombrePartida) {
        asignarNombre(partidaActual,nombrePartida)
      }
  }
  cambiarGuardado(partidaActual,false); // Cambia estado de bandera de guardado
  localStorage.setItem(partidaActual[0].nombre, JSON.stringify(partidaActual)) // Guardado JSON del array con "nombre" de clave
}

$botonGuardado.on("click",() => {
  saveGame();
});

function saveGameAs (){ // Slowsave
  cambiarGuardado(partidaActual,true);
  saveGame();
}

$botonGuardadoComo.on("click",() => {
  saveGameAs();
});

// Funcion de carga de partida
function cargarGame(){
  let partidas = obtenerPartidasGuardadas(); // Carga de nombres de partidas del localStorage

  if (partidas.length === 0){ // Error no hay partidas en la DB
    Swal.fire({
      icon: 'error',
      title: 'No hay partidas guardadas',
    });
    return;
  }

  let optionsHTML = partidas.map(partida => { // Generacion de codigo html de opciones
   let partidaNombre = partida.length > 20 ? partida.slice(0, 20) + '...' : partida; /* Si el nombre es demasiado
   largo usamos un alias con finalizacion acortada con ... */
   return `<option title="${partida}">${partidaNombre}</option>`; /* Codigo html para menu  de seleccion, en el title
   dejamos el nombre completo para que al pasar el mouse por encima del nombre acortado aparezca el completo */
 }).join(''); // Join para poner el codigo html como string para usar en codigo

  Swal.fire({
    title: 'Seleccione la partida a cargar',
    html: `
      <div style="max-height: 200px; overflow-y: auto;">
        <select id="partida-select" class="swal2-input" style="width: 100%;">
          ${optionsHTML}
        </select>
      </div>`,
    focusConfirm: false, // Cambia el foco del boton de confirmacion al select para que no confirme sin seleccionar
    showCancelButton: true,
    confirmButtonText: 'Cargar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      return document.getElementById('partida-select').value; // Devolvemos el valor seleccionado
    }
  }).then((result) => {
    if(result.isConfirmed){
      saltoOnChange = true; // Levantar bandera de salto para que no procce la funcion onChange
      partidaActual = JSON.parse(localStorage.getItem(result.value)); // Carga de partida
      turnoActual = partidaActual.length - 1; // Adaptar variable de turno a la partida cargada
      console.log(turnoActual);
      console.log(partidaActual[partidaActual.length - 1].fen)
      board.position(partidaActual[partidaActual.length - 1].fen) // Cambiar el board a la partida cargada
      console.log(game.turn());
      game = new Chess(partidaActual[partidaActual.length - 1].fen); // Cambiar el game a la partida cargada
      movimientos = [...partidaActual[turnoActual].movimientos]; // Cargar el nuevo Board
      $chat.text(constructorPGN(movimientos));
      console.log(game.turn());
      removeHighlights('black');
      removeHighlights('white');
      juegoIniciado = true; // Indicamos que es una partida comenzada
    }else{
      Swal.fire({
       icon: 'error',
       title: 'Carga cancelada',
       text: 'No se ha seleccionado ninguna partida para cargar.',
      });
    }
  });
}

function obtenerPartidasGuardadas(){ // Sacamos los nombres de partidas del localStorage
  let partidas = [];
  for(let i = 0; i < localStorage.length;i++){
    let clave = localStorage.key(i);
    partidas.push(clave);
  }
  return partidas;
}

$botonCargarGame.on("click",() => {
  if(juegoIniciado === true){
    Swal.fire({
      title: "La partida actual se perdera si no ha sido guardada previamente",
      showCancelButton: true,
      icon: "warning",
      confirmButtonText: "Continuar",
      cancelButtonText: "Atras"
    }).then((result) => {
      if (result.isConfirmed){
        cargarGame();
      }
    })
  }else{cargarGame();}
});

// Funcion activada cada vez que se detecta un cambio en el tablero
function onChange (oldPos, newPos){
  if(!saltoOnChange && !hardSaltoOnChange){
    console.log("inicio onChange");
    if(turnoActual > 0 && game.fen() === partidaActual[turnoActual-1].fen){ // Para evitar errores con el boton de ir hacia atras
      turnoActual--;
      movimientos = [...partidaActual[turnoActual].movimientos]; // Reasignacion, traia problemas de referenciacion
      console.log(movimientos);
      console.log(turnoActual)
      removeHighlights('black');
      removeHighlights('white');
      console.log("Alerta vuelta atras");
      $chat.text(constructorPGN(movimientos));
    }else{
      if(turnoActual < partidaActual.length - 1 && game.fen() === partidaActual[turnoActual+1].fen){ // Para evitar errores con el boton de ir hacia adelante
        turnoActual++;
        console.log(turnoActual)
        movimientos = [...partidaActual[turnoActual].movimientos]; // Reasignacion, traia problemas de referenciacion
        console.log(movimientos);
        removeHighlights('black');
        removeHighlights('white');
        console.log("Alerta procc adelante");
        $chat.text(constructorPGN(movimientos));
      }else{
        turnoActual++;
        partidaActual = partidaActual.slice(0, turnoActual); // Cuando se va hacia atras y se hace un movimiento diferente a los antes hechos debe eliminarse los movimientos de turnos siguientes anteriores para evitar conflictos
        movimientos.push(game.history().slice(-1)[0]);
        console.log(movimientos);
        console.log(constructorPGN(movimientos));
        partidaActual.push({ // Se pushea el nuevo moviento al array
          fen: game.fen(), // Chequeado que la funcion genere un tipo string compatible de Fen
          nombre: partidaActual[turnoActual-1].nombre, // Hereda nombre y firstSave
          firstSave: partidaActual[turnoActual-1].firstSave,
          movimientos: [...movimientos] // Hecho de esta manera xq movimientos solo genera un puntero a movimientos
        })
        console.log(turnoActual)
        console.log('Move animation complete:')
        console.log('Old position: ' + Chessboard.objToFen(oldPos))
        console.log('New position: ' + Chessboard.objToFen(newPos))
        console.log(game.fen());
        console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
        $chat.text(constructorPGN(movimientos));
      }
    }
  }else{
    console.log("Salto");
    saltoOnChange = false // Diferencia entre saltoOnChange y hardSaltoOnChange que saltoOnChange se reinicia al final
  }
}

// Funcion para volver atras llevando al turno anterior
function volverAtras (){
  console.log(turnoActual);
  if (turnoActual > 0){
    console.log("Entro aqui");
    console.log(partidaActual[turnoActual - 1].fen);
    game = new Chess(partidaActual[turnoActual - 1].fen);
    board.position(partidaActual[turnoActual - 1].fen);
    autoRotacion();
    saltoOnChange = false;
  }
}

$botonAtras.on("click",() => {
  volverAtras ();
});

// Funcion para ir adelante llevando al turno siguiente
function irAdelante (){
  if(turnoActual < partidaActual.length - 1){
    game = new Chess(partidaActual[turnoActual + 1].fen);
    board.position(partidaActual[turnoActual + 1].fen);
    autoRotacion();
    saltoOnChange = false;
  }
};

$botonAdelante.on("click",() => {
  irAdelante ();
});

// Funcionamiento del board de movimientos

var $chat = $('#chat');
var movimientos = [];

function constructorPGN(movimientos){
  let pgn = "";
  let contadorTurno = 1;
  let contadorCiclos = 0;
  for(const element of movimientos){ // Recorremos los movimientos
    if(contadorCiclos % 2 === 0){ // Usamos el contadorCiclos para diferenciar turno de blancas y negras
      pgn = pgn + `${contadorTurno}. ${element} `; // Movimientos de blancas con turno agregado al principio
      contadorTurno++;
    }else{
      pgn = pgn + `${element} `; // Movimientos de negras sin turno agregado al principio
    }
    contadorCiclos++;
  }
  return pgn;
}

// Apis functions

/* Cabe destacar que no encontre muchas apis de analisis de jugadas, la primera es de Lichess, donde tiene cacheadas
millones de posiciones, se intentara usar esa ya que la segunda es de un grupo (https://chess-api.com/) que stremea
el motor y no es de mi deseo abusar de sus funcionalidades*/

//Lichess connection

import { tokenconfig } from './config.js';  // Uso del token protegido

async function getBestMoveLichess(fen, attempt){
  console.log("Lichess activaction");
  if(attempt < 3){ // Limitamos llamadas recursivas
    try {
      const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}`; // Carga del fen en la url

      const response = await fetch(url, {
        method: 'GET', // Los resultados estan precacheados por lo tanto los recojemos con GET
        headers: {
          'Authorization': `${tokenconfig.LICHESS_TOKEN}`, // Token de autorizacion de Lichess
          'Content-Type': 'application/json'
        }
      });
      if (response.ok){
        const data = await response.json();
        if (data.pvs && data.pvs.length > 0) {
          const bestMove = data.pvs[0].moves.split(' ')[0]; // Toma solo la primera jugada de la secuencia
          console.log('La mejor jugada de Lichess es:', bestMove);
          return bestMove;
        }else{
          console.log('No hay evaluación de Lichess cacheada disponible para esta posición.'); /* Este bloque se ejecuta
          si la respuesta de la API es exitosa pero la respuesta JSON (data) no contiene ninguna evaluación precacheada
          (pvs no tiene datos). */
        }
      }else{
        console.error('Error en la solicitud a Lichess:', response.status, response.statusText); /* Este bloque se ejecuta si
        la solicitud HTTP a la API no es exitosa */
      }
    }catch (error){
      console.error('Hubo un error al realizar la solicitud a Lichess:', error); // Este bloque caza cualquier otro error
    }
    return postBestMoveChessAPI(fen, attempt); // Si falla la evaluacion usamos Chess-API
  }else{
    console.log("Error de attempts");
  }
}

// Llamada a la función con un ejemplo de FEN
getBestMoveLichess('rnbqkb1r/pppppppp/5n2/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 1);

// Chess-API connection

async function postBestMoveChessAPI(fen, attempt){
  console.log("Chess-API activaction");
  console.log(fen);
  try{
    const url = 'https://chess-api.com/v1';
    const response = await fetch(url, {
      method: 'POST', //  Metodo POST porque tomara el fen como dato y lo pasara por el motor
      headers: {
        'Content-Type': 'application/json'
      },
        body: JSON.stringify({
        fen: fen,
        depth: 10 // Profundidad de analisis de jugadas
      })
    });
    if (response.ok){
      const data = await response.json();
      console.log('Respuesta completa de la API:', data);
      if(data.error){
        attempt ++; // Aumentamos el contador de llamadas
        console.log("Attempts: " + attempt);
        return getBestMoveLichess(cleanFenForAPI(fen), attempt); // Limpiamos el en passant e intentamos devuelta
      }else{
        console.log('La mejor jugada de Chess-API es:', data.move);
        return data.move
      }
    }else{
      const errorText = await response.text();
      console.log(game.fen());
      console.error('Error en la solicitud a Chess-API:', response.status, response.statusText, errorText);
      attempt ++; // Aumentamos el contador de llamadas
      console.log("Attempts: " + attempt);
      return getBestMoveLichess(fen, attempt); // Intentamos devuelta
    }
  }catch (error){
    console.error('Hubo un error al realizar la solicitud a Chess-API:', error); // Este bloque caza cualquier otro error
  }
}

function cleanFenForAPI(fen){ /* Stockfish toma de manera diferente la notacion fen que chess.js en el tema en passant,
el game.fen() devuelve la casilla con posibilidad de en passant aunque no haya ninguna pieza que la pueda tomar,
mientras que stockfish lo toma como un fen invalido esto por ello si fallan los llamados se hara un intento mas
corrigiendo esta casilla, en todo caso si el error era otro simplemente se ejecuta devuelta y dara el mismo error */
  const parts = fen.split(' ');
  if(parts.length !== 6) return fen; // Verifica que el FEN esté correctamente estructurado
  parts[3] = '-'; // Elimina el campo de en passant si no hay capturas posibles
  return parts.join(' ');
}

// Ejemplo de uso
postBestMoveChessAPI('rnbqkb1r/pppppppp/5n2/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 1);

// Boton y puesta en funcionamiento

var $botonMejorJugada = $('#botonMejorJugada');

async function mejorJugada (){
    let bestMove = await getBestMoveLichess(game.fen(), 1); // Llamados a apis
    if(bestMove){
      let source = bestMove.slice(0, 2);
      let target = bestMove.slice(2, 4);
      const posicion = board.position(); // Objeto con las posiciones de todas las piezas
      // Habia un fallo en el enroque que devolvia stockfish y hay que modificarlo para que lo tome el metodo move
      if (source === 'e1'  && target === 'h1'){ // Enroque corto blanco
        if(posicion['e1'] === 'wK'){
          target = 'g1'; // Modificamos el target a una posicion para que el metodo move ejecute correctamente
        }
      }else if(source === 'e1'  && target === 'a1'){ // Enroque largo blanco
        if(posicion['e1'] === 'wK'){
          target = 'b1';
        }
      }else if (source === 'e8' && target === 'h8'){ // Enroque corto negro
        if(posicion['e8'] === 'bK'){
          target = 'g8';
        }
      }else if (source === 'e8' && target === 'a8'){ // Enroque largo negro
        if(posicion['e8'] === 'bK'){
          target = 'b8';
      }}
      game.move({ // Hacemos el movimiento
        from: source,
        to: target,
        promotion: bestMove.slice(4) // Dato para la coronacion
      });
      board.position(game.fen()) // Actualizamos el board
      //Agregar actualizacion de higlights
      highlights(source,target);
    }else{
      alert("Error de funcionamiento de Stockfish");
    }
};

$botonMejorJugada.on("click",() => {
  mejorJugada ();
});

// Juego vs Stockfish

var $botonVsStockfish = $('#botonVsStockfish');

$botonVsStockfish.on("click",() => {
  modoVs = !modoVs;
  stockfishMove();
});

var modoVs = false;
var eleccionColorMotor = null;
var eleccionColorUsuario = null;

async function stockfishMove(){
  let configVs;
  if(modoVs){
    if(juegoIniciado){
      if(!eleccionColorMotor){ // Si no se ha hecho eleccion de color tanto por eleccion o por turno se realiza
        if(game.turn() === 'w'){ /* Si el turno en el que se apreta el toggle es de las blancas se tomara
          como que el usuario eligio las negras y el motor se le dara blancas */
          eleccionColorUsuario = 'b';
          eleccionColorMotor = 'w';
          let position = board.fen();
          configVs = {
            position: position,
            pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
            draggable: true,
            onDragStart: onDragStart,
            onDrop: onDrop,
            onMouseoutSquare: onMouseoutSquare,
            onMouseoverSquare: onMouseoverSquare,
            onChange: onChange,
            onSnapEnd: onSnapEnd,
            orientation: 'black'
          }
          board = Chessboard('myBoard', configVs);
        }else{
          eleccionColorUsuario = 'w';
          eleccionColorMotor = 'b';
        }
      }
      if(game.turn() === eleccionColorMotor){
        mejorJugada ();
        return;
      }else{return;}
    }else{
      eleccionColorUsuario = await menuEleccionWBR();
      if(eleccionColorUsuario === 'b'){
        eleccionColorMotor = 'w';
        configVs = {
          position: 'start',
          pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
          draggable: true,
          onDragStart: onDragStart,
          onDrop: onDrop,
          onMouseoutSquare: onMouseoutSquare,
          onMouseoverSquare: onMouseoverSquare,
          onChange: onChange,
          onSnapEnd: onSnapEnd,
          orientation: 'black'
        }
        board = Chessboard('myBoard', configVs);
      }else{
        eleccionColorMotor = 'b';
        configVs = config;
        board = Chessboard('myBoard', configVs);
      }
      juegoIniciado = true;
      stockfishMove();
    }
  }else{return;}
}

async function menuEleccionWBR(){ // Menu de seleccion de color en inicio de partida vs Motor
  let rutaImgwK = `img/chesspieces/wikipedia/wK.png`;
  let rutaImgbK = `img/chesspieces/wikipedia/bK.png`;
  let rutaImgrK = `img/chesspieces/wikipedia/wbK.svg`;
  return new Promise((resolve) =>{
    Swal.fire({
      title: 'Elige una opción',
      text: 'Selecciona una de las imágenes:',
      showCancelButton: false,
      showConfirmButton: false,
      html:
        `<div style="display: flex; justify-content: space-between;">
          <button id="option1" style="border: none; background: none;">
            <img src="${rutaImgwK}" alt="Reina" width="100" height="100">
          </button>
          <button id="option2" style="border: none; background: none;">
            <img src="${rutaImgrK}" alt="Torre" width="100" height="100">
          </button>
          <button id="option3" style="border: none; background: none;">
            <img src="${rutaImgbK}" alt="Caballo" width="100" height="100">
          </button>
        </div>`,
      didOpen: () => {
        console.log("Menú abierto, esperando elección");
        document.querySelector('#option1').addEventListener('click', () => {
          console.log("Blancas seleccionadas");
          resolve ('w');
          Swal.close(); // Cierra el diálogo después de seleccionar
        });
        document.querySelector('#option2').addEventListener('click', () => {
          console.log("Random seleccionadas");
          if(Math.round(Math.random())){ /* Da un numero "random" entre 0 y 1 y lo redondea, si es mas cercano a 0 son
            blancas si no negras */
            resolve ('w');
            Swal.close();
          }else{
            resolve ('b');
            Swal.close();
          }
        });
        document.querySelector('#option3').addEventListener('click', () => {
          console.log("Negras seleccionadas");
          resolve ('b');
          Swal.close();
        });
      }
    });
  })
}

// Rotacion automatica

var $botonRotacion = $('#botonRotacion');
var rotacion = false;

$botonRotacion.on("click",() => {
  rotacion = !rotacion;
  autoRotacion();
});

function autoRotacion(){
  if(rotacion && !modoVs){ // No debe girar en modoVs
    let posicion = board.fen();
    let configRotacion = {
      position: posicion,
      pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
      draggable: true,
      onDragStart: onDragStart,
      onDrop: onDrop,
      onMouseoutSquare: onMouseoutSquare,
      onMouseoverSquare: onMouseoverSquare,
      onChange: onChange,
      onSnapEnd: onSnapEnd,
      orientation: 'black'
    }
    if(game.turn() === 'w'){
      configRotacion.orientation = 'white';
    }
    board = Chessboard('myBoard', configRotacion);
    saltoOnChange = true;
  }
}

// Configuracion del board inicializado con posicion y funciones a acatar
var config = {
  position: 'start',
  pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
  draggable: true,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onMouseoutSquare: onMouseoutSquare,
  onMouseoverSquare: onMouseoverSquare,
  onChange: onChange,
  onSnapEnd: onSnapEnd
}
var board = Chessboard('myBoard', config);
