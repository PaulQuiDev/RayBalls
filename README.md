# RayBalls
RayBall is a basic WebGL project that demonstrates ray marching to render a simple 3D scene with a sphere. It uses GLSL shaders to calculate distances and simulate lighting, offering an accessible introduction to ray marching.


Features

- Real-time rendering of a sphere using ray marching
- Basic lighting effects to add depth to the sphere
- Adjustable resolution for different screen sizes

Installation

Clone the repository:

    git clone https://github.com/yourusername/RayBall.git

Open the index.html file in your preferred web browser to view the project.

Usage

Simply load index.html in your browser, and the canvas should display a 3D-rendered sphere. The project is designed to adjust the canvas resolution based on your screen size for the best possible experience.
Project Structure

index.html: HTML structure with canvas setup and JavaScript code
script.js: JavaScript that initializes WebGL, compiles shaders, and starts the render loop
raymarch.glsl: Contains the GLSL shader code for ray marching and rendering the sphere

How It Works

WebGL Initialization: Sets up a WebGL context and canvas for rendering.
Ray Marching: Calculates the distance to the sphere and renders it on the canvas using GLSL shaders.
Fragment Shader: Uses ray marching to create lighting and depth effects on the sphere.
