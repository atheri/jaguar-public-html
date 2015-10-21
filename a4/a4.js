/**
 * a4.js
 * @fileoverview Simple webgl game based on FlappyBird, the popular flash
 *      and mobile game.
 * @author Cory Lotze
 */

"use strict";

// Globals
var TUNNEL_GAP = 0.5;
var OFFSET = 0.1;
var YS = 10.0;
var GRAVITY = -1.8;
var X_SPEED = 0.5;
var JUMP = 1.0;
var gameStart = false;
var gameOver = false;
var score = 0;
var P_SIZE = 0.05;

function main() {

    // Vertex shader program
    var VSHADER_SOURCE =
        'attribute vec4 a_Position;\n' +
        'attribute vec2 a_TexCoord;\n' +
        'varying vec2 v_TexCoord;\n' +
        'uniform mat4 u_xformMatrix;\n' +
        'void main() {\n' +
        '  gl_Position = u_xformMatrix * a_Position;\n' +
        '  v_TexCoord = a_TexCoord;\n' +
        '}\n';


    // Fragment shader program
    var FSHADER_SOURCE =
        'precision mediump float;\n' +
        'uniform sampler2D u_Sampler;\n' +
        'varying vec2 v_TexCoord;\n' +
        'void main() {\n' +
        '  gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
        '}\n';
    
    // shader vars
    var shaderVars = {
        u_xformMatrix:0,    // location of uniform for matrix in shader
        a_Position:0,       // location of attribute for position in shader
        u_Sampler:0,     // location of uniform for sampler in shader
        a_TexCoord:0     // location of texture coord
    };
    
    // get WebGL rendering context
    var canvas = document.getElementById('webgl');
    var gl = getWebGLContext(canvas);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // get the text canvas
    var textCanvas = document.getElementById('text');
    var tcv = textCanvas.getContext("2d");

    // Pillars
    var base_pillar = new Float32Array([
                     0.1,  0.1, 1.0, 1.0,
                    -0.1,  0.1, 0.0, 1.0,
                    -0.1, -0.1, 0.0, 0.0,
                     0.1, -0.1, 1.0, 0.0
                ]);

    var vertex_objs = [];
    for (var i = 0; i < 8; i++) {
        vertex_objs.push({
            vertices: base_pillar,
            n: 4,
            texture: 0,
            modelMatrix: new Matrix4,
            buffer: 0,
            drawType: gl.TRIANGLE_FAN,
            gapPos: 0
        });
    }

    // Player
    vertex_objs.push({
        vertices: new Float32Array([
             P_SIZE+0.02,  P_SIZE+0.02, 1.0, 1.0,
            -P_SIZE-0.02,  P_SIZE+0.02, 0.0, 1.0,
            -P_SIZE-0.02, -P_SIZE-0.02, 0.0, 0.0, 
             P_SIZE+0.02, -P_SIZE-0.02, 1.0, 0.0
        ]),
        n: 4,
        texture: 0,
        modelMatrix: new Matrix4,
        buffer: 0,
        drawType: gl.TRIANGLE_FAN,
        speed: 0
    });

    //
    // Button Event
    document.getElementById('restart').onclick = function(){ restart(vertex_objs); }

    // Mouse events
    // onmousedown
    textCanvas.onmousedown = function(ev){ 
        if (gameStart == false && gameOver == false) { gameStart = true; }
        else { jump(vertex_objs); }
    }
    
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return -1;
    }
    
    // set up shaders & locations of shader variables
    var n = initShaderVars(gl, shaderVars);
    if (n < 0) {
        console.log('Failed to initialize shaderVars');
    }
    
    // color to clear background with
    gl.clearColor(0, 0, 0, 1);

    // set up buffers
    n = initBuffers(gl, shaderVars, vertex_objs);
    if (n < 0) {
        console.log('Failed to initialize models');
        return;
    }
    
    // set up textures
    n = initTextures(gl, shaderVars, vertex_objs);
    if (n < 0) {
        console.log('Failed to initialize textures');
        return;
    }

    // Intialize to the game state
    initGameState(vertex_objs);
   
    // start animation loop
    var last = { val: Date.now() };
    /**
     * tick - callback function to update and redraw
     */
    var tick = function() {
        if (gameStart == true) {
            update(vertex_objs, last); 
        }
        else { 
            last.val = Date.now(); 
        }
        render(gl, tcv, shaderVars, vertex_objs);
        requestAnimationFrame(tick, canvas);
    };
    tick();
}

/**
 * jump - causes the character to jump
 * @param {Object} vertex_obs - an array of bundles of vertices
 */
function jump(vertex_objs) {
    var i = vertex_objs.length-1;
    vertex_objs[i].speed = JUMP;
}

/**
 * restart - reset the game to it's intial state
 * @param {Object} vertex_obs - an array of bundles of vertices
 */
function restart(vertex_objs) {
    initGameState(vertex_objs);
}

/**
 * render - renders the scene using WebGL and renders the text with canvas fillText
 * @param {Object} gl - the WebGL rendering context
 * @param {Object} tcv - the textCanvas rending context
 * @param {Object} shaderVars - the locations of shader variables
 * @param {Object} vertex_obs - an array of bundles of vertices
 */
function render(gl, tcv, shaderVars, vertex_objs) {
    var FSIZE = vertex_objs[0].vertices.BYTES_PER_ELEMENT;
    
    // clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    tcv.clearRect(0, 0, tcv.canvas.width, tcv.canvas.height);
    
    for (var i = 0; i < vertex_objs.length; i++) {
        gl.uniformMatrix4fv(shaderVars.u_xformMatrix, false, vertex_objs[i].modelMatrix.elements);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_objs[i].buffer);
        gl.vertexAttribPointer(shaderVars.a_Position, 2, gl.FLOAT, false, FSIZE*4, 0);
        gl.vertexAttribPointer(shaderVars.a_TexCoord, 2, gl.FLOAT, false, FSIZE*4, FSIZE*2);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, vertex_objs[i].texture);
        gl.uniform1i(shaderVars.u_Sampler, 0);
        gl.drawArrays(vertex_objs[i].drawType, 0, vertex_objs[i].n);
    }

    // Render the text to be shown
    tcv.fillStyle = "#FFFFFF";
    tcv.font = "30px Verdana";
    tcv.fillText("Score: "+ score, 5, 30);
    if (gameOver == true) {
        tcv.fillStyle = "#FFFFFF";
        tcv.font = "50px Verdana";
        tcv.fillText("Game Over!", 165, 340);
    }
}

/**
 * animate - animates the objects in the vertex_objs array object
 * @param {Object} vertex_obj - the objects to be animated
 * @param {Number} last - the last time this function executed
 */
function update(vertex_objs, last) {
    var now = Date.now();
    var elapsed = now - last.val;
    last.val = now;
    var x = X_SPEED * elapsed / 1000.0;
    
    // Move the pillars and recycle if needed
    for (var i = 0; i < vertex_objs.length-1; i = i+2) {
        vertex_objs[i].modelMatrix.translate(-x,0,0);
        vertex_objs[i+1].modelMatrix.translate(-x,0,0);
        if (vertex_objs[i].modelMatrix.elements[12] < -1-OFFSET) {
            recyclePillar(vertex_objs, i);
            score += 1;
        }
    }
    
    // Adjust player position based on their speed
    var i = vertex_objs.length-1;
    vertex_objs[i].speed += GRAVITY * elapsed/1000.0;
    x = vertex_objs[i].speed * elapsed/1000.0;
    vertex_objs[i].modelMatrix.translate(0,x,0);

    // Look for failure state
    if (collision(vertex_objs) && gameOver == false) {
        gameOver = true;
        gameStart = false;
    }
}

/**
 * collision - detects whether a collision has happened between the player and
 *      a pillar, or the player and the edges of the screen
 * @param {Object} vertex_obj - the objects to detect collision on
 * @returns {Boolean} - collision true, no collision false.
 */
function collision(vertex_objs) {
    
    // Check if player left screen area
    var player_i = vertex_objs.length-1;
    if (vertex_objs[player_i].modelMatrix.elements[13] < -1+P_SIZE) {
        return true;
    }
    else if (vertex_objs[player_i].modelMatrix.elements[13] > 1-P_SIZE) {
        return true;
    }

    // Check if player collided with pillars
    var pillar_y, pillar_x;
    var player_y, player_x;
    var player_i = vertex_objs.length-1
    for (var i = 0; i < vertex_objs.length-1; i++) {
        var pillar_y = vertex_objs[i].gapPos;
        var pillar_x = vertex_objs[i].modelMatrix.elements[12];
        var player_y = vertex_objs[player_i].modelMatrix.elements[13];
        var player_x = 0;
        if (pillar_x-OFFSET < player_x+P_SIZE) {
            if(pillar_x+OFFSET > player_x-P_SIZE) {
                if (i%2 == 0) {
                    if (pillar_y+TUNNEL_GAP/2 < player_y+P_SIZE) {
                        return true;
                    }
                }
                else {
                    if (pillar_y-TUNNEL_GAP/2 > player_y-P_SIZE) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

/**
 * initShaderVars - Get the locations of the shader vars, stores in shaderVars object
 * @param {Object} gl - the WebGL rendering context
 * @param {Object} shaderVars - the object to store the gl variables in
 * @returns {Boolean} - success or failure
 */
function initShaderVars(gl, shaderVars) {
    shaderVars.u_xformMatrix = gl.getUniformLocation(gl.program, 'u_xformMatrix');
    if (!shaderVars.u_xformMatrix) {
        console.log('Failed to get the storage location of u_xformMatrix');
        return -1;
    }
    shaderVars.u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
    if (shaderVars.u_Sampler < 0) {
        console.log('Failed to get the storage location of u_Sampler');
        return -1;
    }
    shaderVars.a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (shaderVars.a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    shaderVars.a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
    if (shaderVars.a_TexCoord < 0) {
        console.log('Failed to get the storage location of a_TexCoord');
        return -1;
    }
}

/**
 * initModels - initializes WebGL buffers for the vertex_objs array
 * @param {Object} gl - the WebGL rendering context
 * @param {Object} shaderVars - the locations of shader variables
 * @param {Object} vertex_objs - an array of bundles of vertices
 * @returns {Boolean} - success or failure
 */
function initBuffers(gl, shaderVars, vertex_objs) {
    
    // Create Pillar buffer
    var pillar_buffer = gl.createBuffer();
    if (!pillar_buffer) {
        console.log('Failed to create buffer object for pillar');
        return false;
    }
    for (var i = 0; i < vertex_objs.length-1; i++) {
        vertex_objs[i].buffer = pillar_buffer;
    }

    // Setup Pillar buffer
    var FSIZE = vertex_objs[0].vertices.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, pillar_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertex_objs[0].vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(shaderVars.a_Position, 2, gl.FLOAT, false, FSIZE*4, 0);
    gl.enableVertexAttribArray(shaderVars.a_Position);
    
    // Create Player buffer
    var player_buffer = gl.createBuffer();
    if (!player_buffer) {
        console.log('Failed to create buffer object for player');
        return false;
    }
    vertex_objs[vertex_objs.length-1].buffer = player_buffer
    
    // Setup Player buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, player_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertex_objs[vertex_objs.length-1].vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(shaderVars.a_Position, 2, gl.FLOAT, false, FSIZE*4, 0);
    gl.enableVertexAttribArray(shaderVars.a_Position);

    // Setup a_TexCoord
    gl.vertexAttribPointer(shaderVars.a_TexCoord, 2, gl.FLOAT, false, FSIZE*4, FSIZE*2);
    gl.enableVertexAttribArray(shaderVars.a_TexCoord);
    
    return true;
}

/**
 * initTextures - initializes textures
 * @param {Object} gl - the WebGL rendering context
 * @param {Object} shaderVars - the locations of shader variables
 * @param {Object} vertex_objs - an array of bundles of vertices
 * @returns {Boolean} - success or failure
 */
function initTextures(gl, shaderVars, vertex_objs) {
    var pu_text = gl.createTexture();
    var pd_text = gl.createTexture();
    var pl_text = gl.createTexture();
    if (!pu_text && !pd_text && !pl_text) {
        console.log('Failed to create the texture objects');
        return false;
    }

    var pu_image = new Image();
    var pd_image = new Image();
    var pl_image = new Image();
    if (!pu_image && !pd_image && !pl_image) {
        console.log('Failed to create the image objects');
        return false;
    }

    pu_image.onload = function() { loadTexture(gl, pu_text, shaderVars.u_Sampler, pu_image); };
    pd_image.onload = function() { loadTexture(gl, pd_text, shaderVars.u_Sampler, pd_image); };
    pl_image.onload = function() { loadTexture(gl, pl_text, shaderVars.u_Sampler, pl_image); };
    pu_image.src = '../resources/pillar_up.png';
    pd_image.src = '../resources/pillar_down.png';
    pl_image.src = '../resources/player.png';

    // Assign textures to the game objects
    for (var i = 0; i < vertex_objs.length-1; i = i+2) {
        vertex_objs[i].texture = pu_text;
        vertex_objs[i+1].texture = pd_text;
    }
    vertex_objs[vertex_objs.length-1].texture = pl_text;

    return true
}

/**
 * loadTexture - helper function for initTextures, does the webGL calls after
 * the image is loaded.
 * @param {Object} gl - the WebGL rendering context
 * @param {Object} shaderVars - the locations of shader variables
 * @param {Object} u_Sampler - location of the u_Sampler in the shaders
 * @returns {Boolean} - success or failure
 */
function loadTexture(gl, texture, u_Sampler, image) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
}

/**
 * initGameState - returns gamestate to the game starting conditions
 * @param {Object} vertex_objs - an array of bundles of vertices
 */
function initGameState(vertex_objs) {
    // Set the game flags
    gameStart = false;
    gameOver = false;
    score = 0;

    // Create the gap between the squares and scale them to size
    vertex_objs[0].gapPos = 0;
    vertex_objs[1].gapPos = 0;
    for (var i = 0; i < vertex_objs.length-1; i = i+2) {
        vertex_objs[i].modelMatrix.setTranslate(0,TUNNEL_GAP/2+OFFSET*YS,0).scale(1,YS,1);
        vertex_objs[i+1].modelMatrix.setTranslate(0,-TUNNEL_GAP/2-OFFSET*YS,0).scale(1,YS,1);
    }

    // Give all pillars after the first a random vertical location
    for (var i = 2; i < vertex_objs.length-1; i = i+2) {
        var rand = Math.random() - 0.5;
        rand = rand * (2-(TUNNEL_GAP)-0.1);
        vertex_objs[i].gapPos = rand;
        vertex_objs[i+1].gapPos = rand;
        rand = rand / YS;
        vertex_objs[i].modelMatrix.translate(0,rand,0);
        vertex_objs[i+1].modelMatrix.translate(0,rand,0);
    }

    // Line the pillars up off screen
    for (var i = 0; i < (vertex_objs.length-1)/2; i++) {
        vertex_objs[i*2].modelMatrix.translate(i+1,0,0);
        vertex_objs[i*2+1].modelMatrix.translate(i+1,0,0);
    }

    // Set player starting speed
    var i = vertex_objs.length-1;
    vertex_objs[i].speed = 0;
    
    // Set player model matrix to starting position
    vertex_objs[vertex_objs.length-1].modelMatrix = new Matrix4;
}


/**
 * recyclePillar - when a pillar exits screen we add it to the back of the
 *      pillars coming in, this way we don't need to keep messing with the buffers
 * @param {Object} vertex_objs - an array of bundles of vertices
 * @param {int} i - the index of the pillar to be recycled.
 */
function recyclePillar(vertex_objs, i) {
    // Give pillar a new vertical location
    var rand = Math.random() - 0.5;
    rand = rand * (2-(TUNNEL_GAP)-0.1);
    vertex_objs[i].gapPos = rand;
    vertex_objs[i+1].gapPos = rand;
    rand = rand / YS;

    // Size pillar and move to the back of the pillar line offscreen
    vertex_objs[i].modelMatrix.setTranslate(0,TUNNEL_GAP/2+OFFSET*YS,0).scale(1,YS,1);
    vertex_objs[i+1].modelMatrix.setTranslate(0,-TUNNEL_GAP/2-OFFSET*YS,0).scale(1,YS,1);
    vertex_objs[i].modelMatrix.translate(3,rand,0);
    vertex_objs[i+1].modelMatrix.translate(3,rand,0);
}
