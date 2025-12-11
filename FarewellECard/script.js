document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration ---
    const firebaseConfig = {
        apiKey: "AIzaSyDgELe9vRzoHwHhqmRn4K9qY-k7aZQxcr8",
        authDomain: "farewell-8fe2d.firebaseapp.com",
        projectId: "farewell-8fe2d",
        storageBucket: "farewell-8fe2d.firebasestorage.app",
        messagingSenderId: "460231206364",
        appId: "1:460231206364:web:acb2b965bf11a0ceec1b19",
        measurementId: "G-8D8Y1Y7LKB"
    };

    // --- Initialize Firebase and Firestore ---
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const signaturesCollection = db.collection('signatures');

    // --- DOM Elements ---
    const card = document.querySelector('.card');
    const signPageBtn = document.getElementById('sign-page-btn');
    const frontPageBtn = document.getElementById('front-page-btn');
    const signingCanvas = document.getElementById('signing-canvas');
    const addNoteBtn = document.getElementById('add-note-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const downloadBtn = document.getElementById('download-btn');

    // --- UI Logic ---
    signPageBtn.addEventListener('click', () => card.classList.add('is-flipped'));
    frontPageBtn.addEventListener('click', () => card.classList.remove('is-flipped'));

    const fonts = ['Poppins', 'Caveat', 'Dancing Script', 'Kalam', 'Pacifico', 'Shadows Into Light', 'Indie Flower', 'Patrick Hand'];
    let localSignatures = {}; // Use an object for quick lookups by ID

    // --- Firestore Real-time Listener ---
    signaturesCollection.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            const sig = change.doc.data();
            const id = change.doc.id;

            if (change.type === 'added') {
                if (!localSignatures[id]) {
                    createSignatureNote({ ...sig, id });
                }
            } else if (change.type === 'modified') {
                updateNoteInDOM({ ...sig, id });
            } else if (change.type === 'removed') {
                const note = document.querySelector(`.signature-note[data-id='${id}']`);
                if (note) note.remove();
                delete localSignatures[id];
            }
        });
    });

    const createSignatureNote = (sig) => {
        localSignatures[sig.id] = sig;

        const note = document.createElement('div');
        note.classList.add('signature-note', sig.font || 'font-poppins');
        note.style.left = sig.x + 'px';
        note.style.top = sig.y + 'px';
        note.style.transform = `rotate(${sig.rotation || 0}deg)`;
        note.dataset.id = sig.id;

        const messageArea = document.createElement('textarea');
        messageArea.placeholder = 'Your message & name...';
        messageArea.value = sig.message;
        messageArea.rows = 3;

        const controls = document.createElement('div');
        controls.classList.add('note-controls');

        const fontSelect = createFontSelect(sig, note);
        const { saveBtn, editBtn } = createSaveEditButtons(sig, note, messageArea);
        const rotationHandle = createRotationHandle(note, sig.id);

        controls.appendChild(fontSelect);
        controls.appendChild(saveBtn);
        controls.appendChild(editBtn);

        note.appendChild(messageArea);
        note.appendChild(controls);
        note.appendChild(rotationHandle);
        signingCanvas.appendChild(note);

        toggleSave(sig.isSaved, note, messageArea, saveBtn, editBtn);
        makeDraggable(note, sig.id);
    };

    const updateNoteInDOM = (sig) => {
        const note = document.querySelector(`.signature-note[data-id='${sig.id}']`);
        if (!note) return;

        localSignatures[sig.id] = sig;
        note.style.left = sig.x + 'px';
        note.style.top = sig.y + 'px';
        note.style.transform = `rotate(${sig.rotation || 0}deg)`;
        
        note.className = 'signature-note'; // Reset classes
        note.classList.add(sig.font || 'font-poppins');

        const messageArea = note.querySelector('textarea');
        messageArea.value = sig.message;

        const { saveBtn, editBtn } = getSaveEditButtons(note);
        toggleSave(sig.isSaved, note, messageArea, saveBtn, editBtn);
    };

    // --- Button & Control Creation ---
    const createFontSelect = (sig, note) => {
        const fontSelect = document.createElement('select');
        fontSelect.classList.add('font-select');
        fonts.forEach(f => {
            const fontClassName = 'font-' + f.toLowerCase().replace(/\s+/g, '-');
            const option = document.createElement('option');
            option.value = fontClassName;
            option.textContent = f;
            if (fontClassName === sig.font) option.selected = true;
            fontSelect.appendChild(option);
        });
        fontSelect.onchange = () => {
            note.classList.remove(...fonts.map(f => 'font-' + f.toLowerCase().replace(/\s+/g, '-')));
            note.classList.add(fontSelect.value);
            signaturesCollection.doc(sig.id).update({ font: fontSelect.value });
        };
        return fontSelect;
    };

    const createSaveEditButtons = (sig, note, messageArea) => {
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.onclick = () => {
            signaturesCollection.doc(sig.id).update({ 
                message: messageArea.value, 
                isSaved: true 
            });
        };

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.classList.add('edit-button');
        editBtn.onclick = () => {
            signaturesCollection.doc(sig.id).update({ isSaved: false });
        };
        return { saveBtn, editBtn };
    };

    const getSaveEditButtons = (note) => {
        return {
            saveBtn: note.querySelector('.note-controls button:not(.edit-button)'),
            editBtn: note.querySelector('.edit-button')
        };
    };

    const createRotationHandle = (note, id) => {
        const rotationHandle = document.createElement('div');
        rotationHandle.classList.add('rotation-handle');
        rotationHandle.innerHTML = '&#x21bb;';
        makeRotatable(note, rotationHandle, id);
        return rotationHandle;
    };

    const toggleSave = (isSaved, note, messageArea, saveBtn, editBtn) => {
        messageArea.readOnly = isSaved;
        note.classList.toggle('is-saved', isSaved);
        saveBtn.style.display = isSaved ? 'none' : 'inline-block';
        editBtn.style.display = isSaved ? 'inline-block' : 'none';
    };

    // --- Main Actions ---
    addNoteBtn.addEventListener('click', () => {
        const rect = signingCanvas.getBoundingClientRect();
        signaturesCollection.add({
            x: (rect.width / 2) - 110,
            y: 150,
            message: '',
            isSaved: false,
            font: 'font-poppins',
            rotation: 0
        });
    });

    clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear ALL messages? This cannot be undone.')) {
            signaturesCollection.get().then(snapshot => {
                snapshot.docs.forEach(doc => doc.ref.delete());
            });
        }
    });

    downloadBtn.addEventListener('click', () => {
        const elementsToHide = document.querySelectorAll('.top-controls, .nav-button, .note-controls, .rotation-handle');
        elementsToHide.forEach(el => el.style.visibility = 'hidden');

        html2canvas(signingCanvas, {
            backgroundColor: null, // Transparent background
            scale: 2 // Higher resolution
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'farewell-card.png';
            link.href = canvas.toDataURL();
            link.click();
            elementsToHide.forEach(el => el.style.visibility = 'visible');
        });
    });

    // --- Interaction Logic ---
    const makeDraggable = (element, id) => {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const dragMouseDown = (e) => {
            if (e.target.closest('.note-controls, .rotation-handle, textarea')) return;
            e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        };
        element.onmousedown = dragMouseDown;
        const elementDrag = (e) => {
            e.preventDefault();
            pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        };
        const closeDragElement = () => {
            document.onmouseup = null; document.onmousemove = null;
            signaturesCollection.doc(id).update({ x: element.offsetLeft, y: element.offsetTop });
        };
    };

    const makeRotatable = (element, handle, id) => {
        const rotateMouseDown = (e) => {
            e.preventDefault();
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
            const initialRotation = localSignatures[id] ? localSignatures[id].rotation : 0;

            const elementRotate = (e) => {
                const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                const angleDiff = currentAngle - startAngle;
                const newRotation = initialRotation + angleDiff * (180 / Math.PI);
                element.style.transform = `rotate(${newRotation}deg)`;
                signaturesCollection.doc(id).update({ rotation: newRotation });
            };
            document.onmousemove = elementRotate;
            document.onmouseup = () => { document.onmousemove = null; document.onmouseup = null; };
        };
        handle.onmousedown = rotateMouseDown;
    };
});
