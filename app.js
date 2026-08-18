const hero = document.querySelector('.hero');
const venuePanorama = document.querySelector('.venue-panorama');
const roomButtons = [...document.querySelectorAll('.room-hotspots button')];
const roomName = document.getElementById('roomName');
let activeRoom = 0;
let roomTimer;
let roomMoveTimer;

const rooms = [
  { name: 'Ceremony Hall', x: '50%', image: "url('assets/lia-room-ceremony-hall.jpg')" },
  { name: 'Dinner Salon', x: '50%', image: "url('assets/lia-room-dinner-salon.jpg')" },
  { name: 'Detail Suite', x: '50%', image: "url('assets/lia-room-detail-suite.jpg')" },
  { name: 'Grand Entrance', x: '50%', image: "url('assets/lia-room-grand-entrance.jpg')" }
];

function showRoom(index) {
  if (!venuePanorama || !rooms.length) return;
  activeRoom = (index + rooms.length) % rooms.length;
  roomButtons.forEach((button, buttonIndex) => {
    button.classList.toggle('active', buttonIndex === activeRoom);
  });
  venuePanorama.style.setProperty('--pan-x', rooms[activeRoom].x);
  venuePanorama.style.setProperty('--room-image', rooms[activeRoom].image);
  if (roomName) roomName.textContent = rooms[activeRoom].name;
  hero?.style.setProperty('--room-index', activeRoom);
}

function restartRoomFilm() {
  clearInterval(roomTimer);
  roomTimer = setInterval(() => showRoom(activeRoom + 1), 5200);
}

if (venuePanorama) {
  roomButtons.forEach(button => {
    button.addEventListener('click', () => {
      showRoom(Number(button.dataset.room || 0));
      restartRoomFilm();
    });
  });
  hero?.addEventListener('pointermove', event => {
    if (window.matchMedia('(max-width: 850px)').matches) return;
    const rect = hero.getBoundingClientRect();
    const mx = ((event.clientX - rect.left) / rect.width - .5) * 28;
    const my = ((event.clientY - rect.top) / rect.height - .5) * 18;
    hero.style.setProperty('--mx', `${mx}px`);
    hero.style.setProperty('--my', `${my}px`);
    const roomFromPointer = Math.min(rooms.length - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * rooms.length)));
    if (roomFromPointer !== activeRoom) showRoom(roomFromPointer);
    clearInterval(roomTimer);
    clearTimeout(roomMoveTimer);
    roomMoveTimer = setTimeout(restartRoomFilm, 2400);
  });
  hero?.addEventListener('pointerleave', restartRoomFilm);
  showRoom(0);
  restartRoomFilm();
}
