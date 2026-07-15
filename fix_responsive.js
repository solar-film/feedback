const fs = require('fs');

const mediaQuery = `
/* Responsive Fix for Emoji Rating Row on Mobile */
@media (max-width: 480px) {
    .emoji-rating-row {
        gap: 4px;
    }
    .emoji-rating-btn {
        padding: 10px 2px;
        min-height: 100px;
    }
    .emoji-rating-face {
        font-size: 2rem;
    }
    .emoji-rating-label {
        font-size: 0.75rem;
        line-height: 1.25;
        letter-spacing: -0.2px;
    }
}

@media (max-width: 380px) {
    .emoji-rating-row {
        gap: 2px;
    }
    .emoji-rating-btn {
        padding: 8px 1px;
    }
    .emoji-rating-face {
        font-size: 1.6rem;
    }
    .emoji-rating-label {
        font-size: 0.65rem;
        letter-spacing: -0.5px;
    }
}
`;

fs.appendFileSync('style.css', mediaQuery, 'utf8');
console.log("Appended responsive fixes to style.css");
