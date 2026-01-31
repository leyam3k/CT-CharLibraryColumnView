$(document).ready(function() {
    // --- Silly Description Cleaner ---
    // This extension finds all character descriptions in the character management menu,
    // strips out all the messy HTML tags, images, links, and separators, and leaves
    // only pure, clean,readable text.
    // Version 5: Now removes placeholder lines (e.g., a single dot on a line).

    const targetListSelector = '#rm_print_characters_block';
    const characterMenuButton = '#rm_button_characters';
    let listObserver = null;

    /**
     * Finds and cleans all unprocessed character descriptions.
     * This function now performs a multi-step cleaning process that respects text structure.
     */
    function cleanAllDescriptions() {
        // Regex to find Markdown image links and any standalone URLs.
        const urlRegex = /!\[.*?\]\((?:https?:\/\/\S+)\)|https?:\/\/\S+/gi;
        
        // Regex to find lines that consist only of separator characters (3 or more).
        const separatorLineRegex = /^\s*[-_~=*\\/]{3,}\s*$/gm;

        // Regex to find lines that consist only of a single placeholder character (like '.', '*', '_').
        const placeholderLineRegex = /^\s*[._*~-]\s*$/gm;

        const descriptions = $(`${targetListSelector} .ch_description:not(.desc-cleaned)`);

        if (descriptions.length === 0) {
            return; // Nothing new to do
        }

        console.log(`[Silly Description Cleaner] Found ${descriptions.length} new descriptions to format.`);

        descriptions.each(function() {
            const $this = $(this);

            // 1. Decode the HTML entities (e.g., <p> becomes <p>).
            const decodedHtml = $('<textarea />').html($this.html()).val();

            // 2. Convert block-level elements into newlines to preserve structure.
            // This is the key change to fix mashed-together lists and paragraphs.
            const structurePreservingHtml = decodedHtml
                .replace(/<br\s*\/?>/gi, '\n')      // Replace <br> tags with a newline
                .replace(/<\/li>/gi, '\n')          // Add a newline after each list item
                .replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, '\n\n'); // Add two newlines for paragraphs/divs for spacing

            // 3. Strip all remaining HTML tags to get the raw text, which now includes our newlines.
            const rawText = $('<div />').html(structurePreservingHtml).text();

            // 4. Use Regex to remove URLs, separators, and placeholder lines from the raw text.
            let cleanedText = rawText
                .replace(urlRegex, '')             // Remove all URLs and Markdown images
                .replace(separatorLineRegex, '')   // Remove separator lines
                .replace(placeholderLineRegex, '');// Remove placeholder lines (like a single '.')

            // 5. Final cleanup:
            // - Collapse 3 or more consecutive newlines into just two (a single blank line).
            // - Trim whitespace from the start and end of the entire text.
            cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n').trim();

            // 6. Set the element's content. We use .text() which displays newlines correctly.
            $this.text(cleanedText);
            
            // To make the browser render the newlines, we also need to adjust the CSS.
            $this.css('white-space', 'pre-wrap');

            // 7. Mark it as processed so we don't clean it again.
            $this.addClass('desc-cleaned');
        });
    }

    /**
     * Sets up a MutationObserver to watch for new characters being added (e.g., by scrolling).
     */
    function setupObserver() {
        const targetNode = document.querySelector(targetListSelector);

        if (!targetNode) {
            setTimeout(setupObserver, 100);
            return;
        }

        if (targetNode.dataset.observerAttached) {
            return;
        }

        if (listObserver) {
            listObserver.disconnect();
        }

        listObserver = new MutationObserver(() => {
            cleanAllDescriptions();
        });

        listObserver.observe(targetNode, { childList: true });
        targetNode.dataset.observerAttached = 'true';
        console.log("[Silly Description Cleaner] Observer attached to character list.");
    }

    /**
     * The main function to run when the character menu is opened.
     */
    function initializeCleaner() {
        cleanAllDescriptions();
        setupObserver();
    }

    // Listen for clicks on the character menu button to trigger the cleaning process.
    $('body').on('click', characterMenuButton, function() {
        console.log("[Silly Description Cleaner] Character menu opened. Applying structure-aware cleaning!");
        
        // Wait a brief moment for SillyTavern to render the characters.
        setTimeout(initializeCleaner, 200);
    });

    console.log("[Silly Description Cleaner] Structure-Aware extension loaded. Ready to go.");
});