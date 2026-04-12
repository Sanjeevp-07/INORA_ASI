# backend/context/rule_engine.py

class RuleEngine:

    def generate_sentence(self, intent: str, question: str = None) -> str:

        if not question:
            return self._fallback(intent)

        question = question.lower().strip()

        if question.endswith("?"):
            question = question[:-1]

        # ==============================
        # YES / NO INTENT LOGIC
        # ==============================

        if intent in ["YES", "NO"]:

            if question.startswith("did you "):
                phrase = question.replace("did you ", "")
                if intent == "YES":
                    return f"Yes, I {phrase}."
                return f"No, I did not {phrase}."

            if question.startswith("do you "):
                phrase = question.replace("do you ", "")
                if intent == "YES":
                    return f"Yes, I {phrase}."
                return f"No, I do not {phrase}."

            if question.startswith("are you "):
                phrase = question.replace("are you ", "")
                if intent == "YES":
                    return f"Yes, I am {phrase}."
                return f"No, I am not {phrase}."

            if question.startswith("will you "):
                phrase = question.replace("will you ", "")
                if intent == "YES":
                    return f"Yes, I will {phrase}."
                return f"No, I will not {phrase}."

            if question.startswith("can you "):
                phrase = question.replace("can you ", "")
                if intent == "YES":
                    return f"Yes, I can {phrase}."
                return f"No, I cannot {phrase}."

            if question.startswith("have you "):
                phrase = question.replace("have you ", "")
                if intent == "YES":
                    return f"Yes, I have {phrase}."
                return f"No, I have not {phrase}."

            if question.startswith("should you "):
                phrase = question.replace("should you ", "")
                if intent == "YES":
                    return f"Yes, I should {phrase}."
                return f"No, I should not {phrase}."

            if question.startswith("is there "):
                phrase = question.replace("is there ", "")
                if intent == "YES":
                    return f"Yes, there is {phrase}."
                return f"No, there is not {phrase}."

        # ==============================
        # DIRECT INTENT COMMANDS
        # ==============================

        if intent == "HELP":
            if question and "need" in question:
                return "Yes, I need help."
            return "I need help."

        if intent == "WATER":
            if question and "water" in question:
                return "Yes, I need water."
            return "I need water."

        # ==============================
        # WH-QUESTION HANDLING
        # ==============================

        if question.startswith(("what ", "where ", "why ", "how ")):
            if intent == "YES":
                return "Yes."
            if intent == "NO":
                return "No."

        # ==============================
        # FALLBACK
        # ==============================

        return self._fallback(intent)

    def _fallback(self, intent: str) -> str:
        if intent == "YES":
            return "Yes, I agree."
        if intent == "NO":
            return "No, I do not agree."
        if intent == "HELP":
            return "I need help."
        if intent == "WATER":
            return "I need water."
        return "Unknown intent."