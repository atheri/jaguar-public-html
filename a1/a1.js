/* 
 * @file   a1.js
 * @author Cory Lotze
 *
 * @desc - This is a simple webgl rendering. The center of the square follows
 * the cursor, with a color at each corner and in the center.  Left clicking
 * randomizes the colors in each position.
 */

// Vertex Shader
var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_VertexColor;\n' +
    'varying vec4 vColor;\n' +
    'void main() {\n' +
    '    gl_Position = a_Position;\n' +
    '    gl_PointSize = 1.0;\n' +
    '    vColor = a_VertexColor;\n' +
    '}\n';

// Fragment Shader
var FSHADER_SOURCE =
    'precision mediump float;\n' +
    'varying vec4 vColor;\n' +
    'void main() {\n' +
    '    gl_FragColor = vColor;\n' +
    '}\n';

// Globals
var vertices;
var vertex_colors;
var vertexBuffer;
var vertexColorBuffer;

function main() {
    // Get canvas element from html
    var canvas = document.getElementById('webgl');

    // Get rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    
    // Enables the culling of faces that are facing away from the viewpoint.
    // This helps in some of the errors related to drawing order.
    // By default culls faces that are facing  away (drawn clockwise)
    gl.enable(gl.CULL_FACE);

    // Init Shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // Init vertex buffers
    var n = initVertexBuffers(gl);
    if (n < 0) {
        console.log('Failed to set the positions of the vertices');
        return;
    }

    // Mouse event registers
    canvas.onmousemove = function(ev){ mousemove(ev, gl, canvas, n) };
    canvas.onmousedown = function(ev){ mousedown(ev, gl, canvas, n) };

    // Color for clearing the canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, n);
}

/*
 * Initializes the the vertex related buffers (the vertex buffer, and the
 * vertex color buffer).
 *
 * @param gl - gl context in which to init buffers
 *
 * @return n - number of vertices in the vertex buffer
 */
function initVertexBuffers(gl) {
    // Initial vertices
    var n = 6
    vertices = new Float32Array([
         0.0,  0.0,
         0.5,  0.5,
        -0.5,  0.5,
        -0.5, -0.5,
         0.5, -0.5,
         0.5,  0.5
    ])

    // Initial vertex colors
    vertex_colors = new Float32Array([
        0.0, 0.0, 0.0, // Black
        1.0, 0.0, 0.0, // Red
        0.0, 1.0, 0.0, // Green
        0.0, 0.0, 1.0, // Blue
        1.0, 1.0, 0.0, // Yellow
        1.0, 0.0, 0.0  // Red
    ])
    
    // Create vertex buffer object
    vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create the vertexBuffer object');
        return -1;
    }


    // Bind buffer objects to targets
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    
    // Write data to the buffers
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    
    // Assign buffer objects to variables
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    
    // Enable assignment to variables
    gl.enableVertexAttribArray(a_Position);
    
    // Do the same for the vertexColorBuffer
    vertexColorBuffer = gl.createBuffer();
    if (!vertexColorBuffer) {
        console.log('Failed to create the vertexColorBuffer object');
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertex_colors, gl.DYNAMIC_DRAW);
    var a_VertexColor = gl.getAttribLocation(gl.program, 'a_VertexColor');
    if (a_VertexColor < 0) {
        console.log('Failed to get the storage location of a_VertexColor');
        return -1;
    }
    gl.vertexAttribPointer(a_VertexColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_VertexColor);
    
    return n;
}

/*
 * Event handler for the canvas.onmousemove event. Takes the current mouse
 * position and changes the middle vertex of the square to it's location.
 * Redraws the canvas.
 *
 * @param ev - enviroment information passed in from the canvas
 * @param gl - gl context to alter
 * @param canvas - canvas the mouse is in
 * @param n - number of vertices in the vertexBuffer
 */
function mousemove(ev, gl, canvas, n) {
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();
   
    // Coordinate system conversion
    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

    // Change location of middle coordinate of fan
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([x, y]));

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Redraw
    gl.drawArrays(gl.TRIANGLE_FAN, 0, n);
}

/*
 * Event handler for the canvas.onmousedown event. Randomizes the colors of the
 * vertices on every mouse down click. Redraws the canvas.
 *
 * @param ev - enviroment information passed in from the canvas
 * @param gl - gl context to alter
 * @param canvas - canvas the mouse is in
 * @param n - number of vertices in the vertexBuffer
 */
function mousedown(ev, gl, canvas, n) {
    // Randomize Colors
    for (var i = 0; i < n*3; i++) {
        vertex_colors[i] = Math.random();
    }
    // The second and last verticess should be the same color
    vertex_colors[n*3-3] = vertex_colors[3]
    vertex_colors[n*3-2] = vertex_colors[4]
    vertex_colors[n*3-1] = vertex_colors[5]
    
    // Bind buffer and send data
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertex_colors, gl.DYNAMIC_DRAW);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Redraw
    gl.drawArrays(gl.TRIANGLE_FAN, 0, n);
}

