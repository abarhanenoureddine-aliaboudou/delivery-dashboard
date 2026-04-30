// delivery-dashboard/js/delivery-proof.js
(function() {
    'use strict';

    window.initDeliveryProof = function() {
        const captureBtn = document.getElementById('capture-btn');
        const uploadBtn = document.getElementById('upload-btn');
        const fileInput = document.getElementById('file-input');
        const video = document.getElementById('camera-preview');
        const canvas = document.getElementById('proof-canvas');
        const previewImg = document.getElementById('proof-image');
        const previewDiv = document.getElementById('proof-preview');
        const submitBtn = document.getElementById('submit-proof-btn');
        const feedback = document.getElementById('proof-feedback');

        let stream = null;
        let currentOrderId = null;  // should be set from order selection

        // Access camera
        async function startCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                video.srcObject = stream;
                video.style.display = 'block';
                captureBtn.style.display = 'inline-block';
            } catch (err) {
                feedback.textContent = 'Camera access denied. Please use file upload.';
                console.error(err);
            }
        }

        captureBtn?.addEventListener('click', () => {
            if (!currentOrderId) {
                feedback.textContent = 'No order selected for proof.';
                return;
            }
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            showPreview(imageData);
        });

        uploadBtn?.addEventListener('click', () => fileInput.click());

        fileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                showPreview(ev.target.result);
            };
            reader.readAsDataURL(file);
        });

        function showPreview(dataUrl) {
            previewImg.src = dataUrl;
            previewDiv.style.display = 'block';
            video.style.display = 'none';
            captureBtn.style.display = 'none';
        }

        submitBtn?.addEventListener('click', async () => {
            if (!currentOrderId) {
                feedback.textContent = 'No order selected.';
                return;
            }
            const imageData = previewImg.src;
            const key = `proof_${currentOrderId}_${Date.now()}`;
            try {
                localStorage.setItem(key, imageData);
                // Log proof metadata
                const proofEntry = {
                    proofId: `prf_${Date.now()}`,
                    orderId: currentOrderId,
                    driverId: getCurrentUser()?.userId,
                    timestamp: new Date().toISOString(),
                    imageFormat: 'jpeg',
                    localStorageKey: key,
                    status: 'submitted'
                };
                // Simulate updating delivery-proofs.json in-memory
                const proofs = await DataLoader.getDeliveryProofs();
                proofs.push(proofEntry);
                localStorage.setItem('proofs_modified', JSON.stringify(proofs));

                // Update order status to delivered
                const orders = await DataLoader.getOrders();
                const order = orders.find(o => o.orderId === currentOrderId);
                if (order) {
                    order.status = 'delivered';
                    localStorage.setItem('orders_modified', JSON.stringify(orders));
                }
                feedback.textContent = 'Proof submitted! Order marked delivered.';
                // Reset UI
                previewDiv.style.display = 'none';
                if (stream) {
                    video.style.display = 'block';
                    captureBtn.style.display = 'inline-block';
                }
            } catch (err) {
                feedback.textContent = 'Submission failed.';
                console.error(err);
            }
        });

        // Set current order via pub/sub; assume order list clicks dispatch
        document.addEventListener('select-delivery-order', (e) => {
            currentOrderId = e.detail.orderId;
            feedback.textContent = '';
        });

        // Cleanup on page leave
        window.addEventListener('beforeunload', () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        });
    };
})();
