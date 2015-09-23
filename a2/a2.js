/**
 * a2.js
 * @fileoverview Demos the different drawArrays modes on a varied sets of points
 * @author Cory Lotze
 * Adapted from the TwoBuffers.js exmaple from class
 */

"use strict";

function main() {

    // Vertex shader program
    var VSHADER_SOURCE =
        'attribute vec4 a_Position;\n' +
        'uniform mat4 u_xformMatrix;\n' +
        'void main() {\n' +
        '  gl_Position = u_xformMatrix * a_Position;\n' +
        '  gl_PointSize = 4.0;\n' +
        '}\n';

    // Fragment shader program
    var FSHADER_SOURCE =
        'precision mediump float;\n' +
        'uniform vec4 u_Color;\n' +
        'void main() {\n' +
        '  gl_FragColor = u_Color;\n' +
        '}\n';

    // shader vars
    var shaderVars = {
        u_xformMatrix:0,    // location of uniform for matrix in shader
        a_Position:0,       // location of attribute for position in shader
        u_Color:0     // location of uniform for color in shader
    };

    // Color Info
    var vColors = new Float32Array([0,1,0,1]);

    // Vertex Info - Array of objects. Accessed by vertex_objs[i].varname
    var vertex_objs = [
        { 
            vertices: new Float32Array([
                -0.5, -0.5
            ]),
            n: 1,
            modelMatrix: new Matrix4,
            buffer: 0
        },
        { 
            vertices: new Float32Array([
                -0.5, -0.5,
                 0.5, -0.5
            ]),
            n: 2,
            modelMatrix: new Matrix4,
            buffer: 0
        },
        { 
            vertices: new Float32Array([
                -0.5, -0.5,
                 0.5, -0.5,
                 0.5,  0.5
            ]),
            n: 3,
            modelMatrix: new Matrix4,
            buffer: 0
        },
        { 
            vertices: new Float32Array([
                -0.5, -0.5,
                 0.5, -0.5,
                 0.5,  0.5,
                -0.5,  0.5
            ]),
            n: 4,
            modelMatrix: new Matrix4,
            buffer: 0
        },
        { 
            vertices: new Float32Array([
                -0.5, -0.5,
                 0.5, -0.5,
                -0.5,  0.5,
                 0.5,  0.5,
                 0.0,  0.75
            ]),
            n: 5,
            modelMatrix: new Matrix4,
            buffer: 0
        }
    ];

    // get WebGL rendering context
    var canvas = document.getElementById('webgl');
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Buttons
    var num_obj = 0;
    document.getElementById('vertex1').onclick = function(){ num_obj = 0; }
    document.getElementById('vertex2').onclick = function(){ num_obj = 1; }
    document.getElementById('vertex3').onclick = function(){ num_obj = 2; }
    document.getElementById('vertex4').onclick = function(){ num_obj = 3; }
    document.getElementById('vertex5').onclick = function(){ num_obj = 4; }
    document.getElementById('colors').onclick = function(){ randomizeColors(vColors); }
    document.getElementById('plus').onclick = function(){ speed = speed + speed_mod; }
    document.getElementById('minus').onclick = function(){ speed = speed - speed_mod; }
    document.getElementById('stop').onclick = function(){ speed = 0; }
    document.getElementById('reset').onclick = function(){ angle.val = 0; }

    var draw_type = gl.POINTS; // Default drawArrays mode
    document.getElementById('points').onclick = function(){ draw_type = gl.POINTS; }
    document.getElementById('lines').onclick = function(){ draw_type = gl.LINES; }
    document.getElementById('line_strip').onclick = function(){ draw_type = gl.LINE_STRIP; }
    document.getElementById('line_loop').onclick = function(){ draw_type = gl.LINE_LOOP; }
    document.getElementById('triangles').onclick = function(){ draw_type = gl.TRIANGLES; }
    document.getElementById('triangle_strip').onclick = function(){ draw_type = gl.TRIANGLE_STRIP; }
    document.getElementById('triangle_fan').onclick = function(){ draw_type = gl.TRIANGLE_FAN; }
   
    // Mouse events - I couldn't get ondrag to work, so I used a flag with
    // onmousedown & onmouseup in combination with onmousemove to do a similiar
    var vertex_index;
    var dragging = false;
    canvas.onmouseup = function(ev){ dragging = false; }
    canvas.onmousedown = function(ev){ 
        dragging = true; 
        vertex_index = findClosestVertexIndex(ev, gl, canvas, vertex_objs, num_obj);
    }
    
    canvas.onmousemove = function(ev){
        if (dragging == true) {
            mousedrag(ev, gl, canvas, vertex_objs, num_obj, vertex_index); 
        }
    }

    // set up shaders & locations of shader variables
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }
    shaderVars.u_xformMatrix = gl.getUniformLocation(gl.program, 'u_xformMatrix');
    if (!shaderVars.u_xformMatrix) {
        console.log('Failed to get the storage location of u_xformMatrix');
        return;
    }
    shaderVars.u_Color = gl.getUniformLocation(gl.program, 'u_Color');
    if (shaderVars.u_Color < 0) {
        console.log('Failed to get the storage location of u_Color');
        return -1;
    }
    shaderVars.a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (shaderVars.a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }

    // color to clear background with
    gl.clearColor(0, 0, 0, 1);

    // set up models
    var n = initModels(gl, shaderVars, vertex_objs);
    if (n < 0) {
        console.log('Failed to initialize models');
        return;
    }
    
    // start animation loop
    var last = { val: Date.now() };
    var angle = { val: 0 };
    var speed = 0;
    var speed_mod = 10;
    /**
     * tick - callback function to animate and redraw
     */
    var tick = function() {
        animate(vertex_objs, num_obj, last, angle, speed);
        render(gl, shaderVars, vertex_objs, num_obj, draw_type, vColors);
        requestAnimationFrame(tick, canvas);
    };
    tick();
}

/**
 * randomizeColors - randomizes the rgb colors of vColors
 * @param {Object} vColors - the array of colors to be randomized
 */
function randomizeColors(vColors) {
    // Randomize Colors
    for (var i = 0; i < vColors.length-1; i++) {
        vColors[i] = Math.random();
    }
}

/**
 * mousedrag - called when the mouse is being dragged, moves the vertex at
 *      vertext_index to the current mouse position
 * @param {Object} ev - enviroment object passed in from the event callback
 * @param {Object} gl - the WebGL rendering context
 * @param {Object} canvas - the html canvas
 * @param {Object} vertex_obs - an array of bundles of vertices
 * @param {Number} num_obj - which obj in vertex_objs to render
 * @param {Number} vertex_index - index of the vertex to be moved
 */
function mousedrag(ev, gl, canvas, vertex_objs, num_obj, vertex_index) {

    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();

    // Coordinate system conversion
    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

    // Move the vertex in all buffers to the location of the mouse
    for (var i = 0; i < vertex_objs.length; i++) {
        if (vertex_index < vertex_objs[i].n) {
            vertex_objs[i].vertices[2*vertex_index] = x;
            vertex_objs[i].vertices[2*vertex_index+1] = y;
        }
    }
    
    // Rebuffer the updated data
    for (var i = 0; i < vertex_objs.length; i++) {
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_objs[i].buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertex_objs[i].vertices, gl.STATIC_DRAW);
    }
}

/**
 * findClosestVertexIndex - finds the closest currently rendered vertex to the
 *      current mouse position
 * @param {Object} ev - enviroment object passed in from the event callback
 * @param {Object} gl - the WebGL rendering context
 * @param {Object} canvas - the html canvas
 * @param {Object} vertex_obs - an array of bundles of vertices
 * @param {Number} num_obj - which obj in vertex_objs is rendered
 * @returns {Number} - the index of the vertex found to be the closest
 */
function findClosestVertexIndex(ev, gl, canvas, vertex_objs, num_obj) {
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();

    // Coordinate system conversion
    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
 
    // Find shortest distance to mouse and vertex
    var vx = vertex_objs[num_obj].vertices[0];
    var vy = vertex_objs[num_obj].vertices[1];
    var min_dist = Math.sqrt(Math.pow((x-vx), 2) + Math.pow((y-vy), 2));
    var min_i = 0;
    
    var temp_dist;
    for (var i = 1; i < vertex_objs[num_obj].n; i++) {
        vx = vertex_objs[num_obj].vertices[2*i];
        vy = vertex_objs[num_obj].vertices[2*i+1];
        temp_dist = Math.sqrt(Math.pow((x-vx), 2) + Math.pow((y-vy), 2));
        if (temp_dist < min_dist) {
            min_dist = temp_dist;
            min_i = i;
        }
    }
    return min_i;
}

/**
 * animate - animates the objects in the vertex_objs array object
 * @param {Object} vertex_obj - the objects to be animated
 * @param {Object} num_obj - the index of index_objs to animate
 * @param {Number} last - the last time this function executed
 * @param {Number} angle - the angle of rotation
 * @param {Number} speed - the speed at which to rotate
 */
function animate(vertex_objs, num_obj, last, angle, speed) {
    var now = Date.now();
    var elapsed = now - last.val;
    last.val = now;
    angle.val = angle.val + (speed * elapsed) / 1000.0;
    vertex_objs[num_obj].modelMatrix.setRotate(angle.val, 0, 0, 1);
}

/**
 * render - renders the scene using WebGL
 * @param {Object} gl - the WebGL rendering context
 * @param {Object} shaderVars - the locations of shader variables
 * @param {Object} vertex_obs - an array of bundles of vertices
 * @param {Number} num_obj - which obj in vertex_objs to render
 * @param {Number} draw_type - enumerated mode for gl.drawArrays to use
 * @param {Object} vColors - the rgba color to render with
 */
function render(gl, shaderVars, vertex_objs, num_obj, draw_type, vColors) {

    // clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_objs[num_obj].buffer);
    // Send modelMatrix
    gl.uniformMatrix4fv(shaderVars.u_xformMatrix, false, vertex_objs[num_obj].modelMatrix.elements);
    // Send vertex color
    gl.uniform4f(shaderVars.u_Color, vColors[0], vColors[1], vColors[2], vColors[3]); //TODO
    gl.vertexAttribPointer(shaderVars.a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(draw_type, 0, vertex_objs[num_obj].n);
}

/**
 * initModels - initializes WebGL buffers for the vertex_objs array
 * @param {Object} gl - the WebGL rendering context
 * @param {Object} shaderVars - the locations of shader variables
 * @param {Object} vertex_obs - an array of bundles of vertices
 * @returns {Boolean} - success or failure
 */
function initModels(gl, shaderVars, vertex_objs) {

    // set up vertex buffers
    for (var i = 0; i < vertex_objs.length; i++) {
        vertex_objs[i].buffer = gl.createBuffer();
        if (!vertex_objs[i].buffer) {
            console.log('Failed to create buffer object for vertex bundles');
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_objs[i].buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertex_objs[i].vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shaderVars.a_Position, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderVars.a_Position);
    }

    return true;
}
