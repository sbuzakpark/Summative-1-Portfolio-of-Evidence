"use strict";

(() => {
    const serviceKey = "mlungisiSelectedServices";
    const typeKey = "mlungisiServiceTypes";

    // Keep saved selections optional so storage restrictions never break the page.
    function readList(key) {
        try {
            const value = JSON.parse(sessionStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value.filter(item => typeof item === "string") : [];
        } catch (error) {
            console.warn("Could not read saved selections.", error);
            return [];
        }
    }

    function saveList(key, values) {
        try {
            sessionStorage.setItem(key, JSON.stringify(values));
        } catch (error) {
            console.warn("Could not save selections for the next page.", error);
        }
    }

    // Highlight the link for the page currently being viewed.
    function setupNavigation() {
        const page = window.location.pathname.split("/").pop().toLowerCase() || "index.html";

        document.querySelectorAll("nav a[href]").forEach(link => {
            const target = link.getAttribute("href").split("/").pop().toLowerCase();
            if (target === page) {
                link.setAttribute("aria-current", "page");
            }
        });
    }

    // The home-page welcome button reveals an accessible live announcement.
    function setupWelcomeMessage() {
        const button = document.getElementById("welcomeButton");
        const message = document.getElementById("welcomeMessage");

        if (!button || !message) {
            return;
        }

        button.addEventListener("click", () => {
            message.textContent = "Welcome! Thank you for visiting Mlungisi WeKhaya.";
            message.hidden = false;
        });
    }

    // Make home-page service choices persistent and carry them to the enquiry form.
    function setupServiceSelection() {
        const buttons = Array.from(document.querySelectorAll("main button.service-option"));
        const typeInputs = Array.from(document.querySelectorAll(
            'input[type="checkbox"][name="residential"], input[type="checkbox"][name="commercial"]'
        ));

        if (buttons.length || typeInputs.length) {
            const selectedServices = new Set(readList(serviceKey));
            const selectedTypes = new Set(readList(typeKey));
            const question = Array.from(document.querySelectorAll("main p"))
                .find(item => item.textContent.trim().toLowerCase() === "what kind of services do you need?");
            const quoteLink = document.createElement("a");

            quoteLink.href = "enquiry.html";
            quoteLink.className = "quote-link";
            quoteLink.textContent = "Continue to enquiry";
            quoteLink.hidden = true;
            if (question) {
                question.insertAdjacentElement("afterend", quoteLink);
            }

            function updateQuoteLink() {
                quoteLink.hidden = selectedServices.size === 0 && selectedTypes.size === 0;
            }

            buttons.forEach(button => {
                const name = button.textContent.trim();
                button.type = "button";
                button.setAttribute("aria-pressed", String(selectedServices.has(name)));
                button.classList.toggle("service-selected", selectedServices.has(name));

                button.addEventListener("click", () => {
                    if (selectedServices.has(name)) {
                        selectedServices.delete(name);
                    } else {
                        selectedServices.add(name);
                    }

                    button.setAttribute("aria-pressed", String(selectedServices.has(name)));
                    button.classList.toggle("service-selected", selectedServices.has(name));
                    saveList(serviceKey, Array.from(selectedServices));
                    updateQuoteLink();
                });
            });

            typeInputs.forEach(input => {
                input.checked = selectedTypes.has(input.name);
                input.addEventListener("change", () => {
                    if (input.checked) {
                        selectedTypes.add(input.name);
                    } else {
                        selectedTypes.delete(input.name);
                    }

                    saveList(typeKey, Array.from(selectedTypes));
                    updateQuoteLink();
                });
            });

            updateQuoteLink();
        }

        const enquiryForm = document.querySelector("form[data-form='enquiry']");
        if (!enquiryForm) {
            return;
        }

        const services = readList(serviceKey);
        const types = readList(typeKey);
        const selections = [
            ...types
                .filter(type => type === "residential" || type === "commercial")
                .map(type => type === "residential" ? "Residential" : "Commercial"),
            ...services
        ];

        if (selections.length) {
            const summary = document.createElement("section");
            const heading = document.createElement("h2");
            const details = document.createElement("p");
            const pageHeading = document.querySelector("h1");

            summary.className = "selected-service-summary";
            summary.setAttribute("aria-live", "polite");
            heading.textContent = "Your selected repair services";
            details.textContent = selections.join(", ");
            summary.append(heading, details);

            if (pageHeading) {
                pageHeading.insertAdjacentElement("afterend", summary);
            }
        }
    }

    // Convert FAQ question headings into keyboard-accessible disclosure controls.
    function setupFaqs() {
        document.querySelectorAll("main h4").forEach((heading, index) => {
            const answer = heading.nextElementSibling;
            if (!answer || answer.tagName !== "P") {
                return;
            }

            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "faq-toggle";
            toggle.textContent = heading.textContent.trim();
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-controls", `faq-answer-${index + 1}`);
            answer.id = `faq-answer-${index + 1}`;
            answer.hidden = true;
            heading.replaceChildren(toggle);

            toggle.addEventListener("click", () => {
                const expanded = toggle.getAttribute("aria-expanded") === "true";
                toggle.setAttribute("aria-expanded", String(!expanded));
                answer.hidden = expanded;
            });
        });
    }

    // Let visitors preview gallery photos in a native modal dialog.
    function setupGallery() {
        const images = document.querySelectorAll("main article img");
        if (!images.length || typeof HTMLDialogElement === "undefined") {
            return;
        }

        const dialog = document.createElement("dialog");
        const closeButton = document.createElement("button");
        const preview = document.createElement("img");
        const caption = document.createElement("p");

        dialog.className = "gallery-dialog";
        dialog.setAttribute("aria-label", "Gallery image preview");
        closeButton.type = "button";
        closeButton.className = "gallery-dialog-close";
        closeButton.textContent = "Close";
        closeButton.addEventListener("click", () => dialog.close());
        dialog.append(closeButton, preview, caption);
        document.body.append(dialog);

        dialog.addEventListener("click", event => {
            if (event.target === dialog) {
                dialog.close();
            }
        });

        images.forEach(image => {
            const title = image.closest("figure")?.querySelector("h3")?.textContent.trim() || "Gallery image";
            image.tabIndex = 0;
            image.setAttribute("role", "button");
            image.setAttribute("aria-label", `View larger image: ${title}`);

            function openPreview() {
                preview.src = image.currentSrc || image.src;
                preview.alt = image.alt || title;
                caption.textContent = preview.alt;
                dialog.showModal();
                closeButton.focus();
            }

            image.addEventListener("click", openPreview);
            image.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openPreview();
                }
            });
        });
    }

    // Validate forms and show local feedback without claiming data was transmitted.
    function setupForms() {
        document.querySelectorAll("form").forEach(form => {
            const feedback = form.querySelector(".form-feedback") || document.createElement("p");
            const isEnquiry = form.matches("[data-form='enquiry']");

            feedback.className = "form-feedback";
            feedback.setAttribute("role", "status");
            feedback.setAttribute("aria-live", "polite");
            if (!feedback.parentElement) {
                form.append(feedback);
            }

            if (isEnquiry) {
                const volunteerChoice = form.querySelector('[name="enquiryType"][value="volunteer"]');
                const sponsorChoice = form.querySelector('[name="enquiryType"][value="sponsor"]');
                const volunteerSection = form.querySelector("#experience")?.closest("fieldset");
                const sponsorSection = form.querySelector("#sponsorshipType")?.closest("fieldset");
                const experience = form.querySelector("#experience");
                const sponsorshipType = form.querySelector("#sponsorshipType");
                const sponsorMessage = form.querySelector("#sponsorMessage");

                // Only reveal and require the detail fields relevant to the selected interest.
                function updateSections() {
                    const volunteerSelected = volunteerChoice.checked;
                    const sponsorSelected = sponsorChoice.checked;

                    volunteerSection.hidden = !volunteerSelected;
                    sponsorSection.hidden = !sponsorSelected;
                    experience.required = volunteerSelected;
                    sponsorshipType.required = sponsorSelected;
                    sponsorMessage.required = sponsorSelected;
                }

                volunteerChoice.addEventListener("change", updateSections);
                sponsorChoice.addEventListener("change", updateSections);
                updateSections();

                form.addEventListener("submit", event => {
                    event.preventDefault();
                    feedback.textContent = "";

                    if (!volunteerChoice.checked && !sponsorChoice.checked) {
                        feedback.textContent = "Please select volunteering, sponsorship, or both.";
                        volunteerChoice.focus();
                        return;
                    }

                    if (!form.reportValidity()) {
                        return;
                    }

                    feedback.textContent = "Your enquiry is valid, but it was not sent because this site has no submission service connected.";
                });
                return;
            }

            const nameInput = form.querySelector("#name");
            const requiredFields = form.querySelectorAll(
                'input:not([type="checkbox"]):not([type="submit"]), textarea'
            );
            requiredFields.forEach(field => {
                field.required = true;
            });

            form.addEventListener("submit", event => {
                event.preventDefault();
                feedback.textContent = "";

                if (!form.reportValidity()) {
                    return;
                }

                const name = nameInput ? nameInput.value.trim() : "";
                feedback.textContent = `Thank you${name ? `, ${name}` : ""}. Your message is valid, but it was not sent because this site has no submission service connected.`;
            });
        });
    }

    function initialize() {
        setupNavigation();
        setupWelcomeMessage();
        setupServiceSelection();
        setupFaqs();
        setupGallery();
        setupForms();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
