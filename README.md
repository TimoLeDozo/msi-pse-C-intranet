# MSI PSE - Hypothèse C (Intranet)

Version "Client-Serveur" du générateur de propales.
Permet d'utiliser une interface Web (héritée de l'Hypothèse B) connectée à un serveur Python local (hérité de l'Hypothèse C) tournant sur l'Intranet de l'école.

## Installation

1. `pip install -r requirements.txt`
2. Placer le template Word dans `model/Template_B2.docx`
3. Lancer le serveur : `python app.py`
4. Accéder à `http://localhost:8000`