const canvas = document.getElementById("petCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 120;
canvas.height = 120;

const petImg = new Image();
petImg.src = "./pet.png"; // o arquivo deve estar em src/pet.png

let x = 0;
let direction = 1;
let speed = 1.5;
let jumpHeight = 0;
let jumpingUp = true;

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    x += speed * direction;

    if (x > canvas.width - 60 || x < 0) {
        direction *= -1;
    }

    if (jumpingUp) {
        jumpHeight += 0.8;
        if (jumpHeight > 10) jumpingUp = false;
    } else {
        jumpHeight -= 0.8;
        if (jumpHeight < 0) jumpingUp = true;
    }

    const width = 60;
    const height = 60;
    ctx.drawImage(petImg, x, canvas.height - height - jumpHeight, width, height);

    requestAnimationFrame(animate);
}

petImg.onload = () => animate();
