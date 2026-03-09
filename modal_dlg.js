  const openBtn   = document.getElementById('openEditBtn');
  const overlay   = document.getElementById('modalOverlay');
  const cancelBtn = document.getElementById('cancelBtn');
  const saveBtn   = document.getElementById('saveBtn');
  const editInput = document.getElementById('editLabel');

  function openModal(initialText = '') {
    editInput.value = initialText;
    overlay.style.display = 'flex';   // flex to enable centering
    editInput.focus();
  }

  function closeModal() {
    overlay.style.display = 'none';
  }

    openBtn.addEventListener('click', () => {
    // Here you’d read from the SVG element you’re “editing”
    const currentLabel = 'Some SVG';  // example
    openModal(currentLabel);
  });

  cancelBtn.addEventListener('click', closeModal);

  saveBtn.addEventListener('click', () => {
    const newLabel = editInput.value.trim();
    console.log('Save clicked, new value:', newLabel);

    // Example: update SVG text
    const svgText = document.querySelector('#mysvg text');
    if (svgText) svgText.textContent = newLabel;

    closeModal();
  });

  // Close with ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display === 'flex') {
      closeModal();
    }
  });

  // Optional: click outside dialog to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const openBtn   = document.getElementById('openEditBtn');
  const overlay   = document.getElementById('modalOverlay');
  const cancelBtn = document.getElementById('cancelBtn');
  const saveBtn   = document.getElementById('saveBtn');
  const editInput = document.getElementById('editLabel');

  function openModal(initialText = '') {
    editInput.value = initialText;
    overlay.style.display = 'flex';   // flex to enable centering
    editInput.focus();
  }

  function closeModal() {
    overlay.style.display = 'none';
  }

  openBtn.addEventListener('click', () => {
    // Here you’d read from the SVG element you’re “editing”
    const currentLabel = 'Some SVG';  // example
    openModal(currentLabel);
  });

  cancelBtn.addEventListener('click', closeModal);

  saveBtn.addEventListener('click', () => {
    const newLabel = editInput.value.trim();
    console.log('Save clicked, new value:', newLabel);

    // Example: update SVG text
    const svgText = document.querySelector('#mysvg text');
    if (svgText) svgText.textContent = newLabel;

    closeModal();
  });

  // Close with ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display === 'flex') {
      closeModal();
    }
  });

  // Optional: click outside dialog to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });