import os
import joblib
import numpy as np

from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split


class EEGClassifier:
    def __init__(self, model_path="models/inora_rf_model.pkl"):
        self.model_path = model_path
        self.model = None

        if os.path.exists(self.model_path):
            self.load_model()
        else:
            print(f"[CLASSIFIER] Model file not found at {self.model_path}")

    # =====================================
    # ----------- TRAIN --------------------
    # =====================================
    def train(self, X: np.ndarray, y: np.ndarray):

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("rf", RandomForestClassifier(
                n_estimators=200,
                max_depth=None,
                random_state=42
            ))
        ])

        pipeline.fit(X_train, y_train)

        y_pred = pipeline.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        cm = confusion_matrix(y_test, y_pred)

        print("\n[MODEL EVALUATION]")
        print(f"Accuracy: {acc:.4f}")
        print("Confusion Matrix:")
        print(cm)

        self.model = pipeline
        self.save_model()

        return {
            "accuracy": float(acc),
            "confusion_matrix": cm.tolist()
        }

    # =====================================
    # ----------- PREDICT ------------------
    # =====================================
    def predict(self, feature_vector: np.ndarray):

        if self.model is None:
            raise Exception("Model not trained or loaded.")

        feature_vector = feature_vector.reshape(1, -1)


        prediction = str(self.model.predict(feature_vector)[0])
        probabilities = self.model.predict_proba(feature_vector)[0]

        confidence = np.max(probabilities)

        return {
            "prediction": prediction,
            "confidence": float(confidence)
        }

    # =====================================
    # ----------- SAVE ---------------------
    # =====================================
    def save_model(self):
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump(self.model, self.model_path)
        print("[CLASSIFIER] Model saved.")

    # =====================================
    # ----------- LOAD ---------------------
    # =====================================
    def load_model(self):
        self.model = joblib.load(self.model_path)
        print("[CLASSIFIER] Model loaded.")