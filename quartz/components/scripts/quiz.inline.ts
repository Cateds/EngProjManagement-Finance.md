function setupQuizCards() {
  const cards = document.querySelectorAll<HTMLElement>(".quiz-card[data-answer]");

  cards.forEach((card) => {
    const answer = card.dataset.answer?.trim().toUpperCase();
    if (!answer) return;

    const options = card.querySelectorAll<HTMLButtonElement>(".quiz-option[data-option]");
    options.forEach((option) => {
      const onClick = () => {
        if (card.classList.contains("answered")) return;

        const selected = option.dataset.option?.trim().toUpperCase();
        const isCorrect = selected === answer;

        card.classList.add("answered", isCorrect ? "answered-correct" : "answered-incorrect");
        card.dataset.selected = selected ?? "";

        options.forEach((current) => {
          const currentOption = current.dataset.option?.trim().toUpperCase();
          current.disabled = true;
          current.setAttribute("aria-pressed", current === option ? "true" : "false");

          if (currentOption === answer) {
            current.classList.add("correct");
          } else if (current === option) {
            current.classList.add("incorrect");
          } else {
            current.classList.add("muted");
          }
        });
      };

      option.addEventListener("click", onClick);
      window.addCleanup(() => option.removeEventListener("click", onClick));
    });
  });
}

document.addEventListener("nav", setupQuizCards);
