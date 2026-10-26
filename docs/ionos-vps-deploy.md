# Bustrinker auf IONOS VPS (Ubuntu)

## Architektur
GitHub Actions testet jeden Push auf main mit Node 22 und veröffentlicht danach Dateien über einen SSH-Schlüssel als eingeschränkter Benutzer auf dem VPS. Releases liegen unter /var/www/bustrinker/releases/<commit>; /var/www/bustrinker/current wird nach vollständigem Upload atomar umgestellt. Nginx liest nur aus current. TLS wird mit Certbot eingerichtet.

## Einmalig auf dem VPS als root

Vorher in IONOS prüfen, dass die IP 217.154.240.41 zum VPS gehört und dass TCP 22, 80 und 443 in der IONOS-Firewall freigegeben sind.

```bash
apt update && apt upgrade -y
apt install -y nginx rsync openssh-server certbot python3-certbot-nginx ufw
adduser --disabled-password --gecos "" bustrinker-deploy
install -d -o bustrinker-deploy -g bustrinker-deploy -m 755 /var/www/bustrinker
install -d -o bustrinker-deploy -g bustrinker-deploy -m 755 /var/www/bustrinker/releases
install -d -o bustrinker-deploy -g bustrinker-deploy -m 700 /home/bustrinker-deploy/.ssh
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

Wenn SSH einen abweichenden Port nutzt, vor Aktivierung von UFW diesen explizit erlauben. Bestehende Dienste und Firewall-Regeln vorher prüfen.

## Deploy-Schlüssel

Ein dediziertes ED25519-Schlüsselpaar auf einem sicheren Gerät erzeugen (nicht in Git committen):

```bash
ssh-keygen -t ed25519 -f ./bustrinker_deploy -C bustrinker-github-actions
```

Den Inhalt von `bustrinker_deploy.pub` auf dem VPS an `/home/bustrinker-deploy/.ssh/authorized_keys` anhängen. Berechtigungen: authorized_keys 600; Eigentümer bustrinker-deploy. Den Inhalt der *privaten* Datei `bustrinker_deploy` als GitHub Actions Secret `DEPLOY_SSH_KEY` hinterlegen. Private Keys niemals im Chat teilen.

Den SSH-Hostschlüssel-Fingerprint des VPS über eine vertrauenswürdige IONOS-Konsole oder vorbestehende vertrauenswürdige Verbindung verifizieren. Erst danach die passende `ssh-ed25519` Host-Key-Zeile für `217.154.240.41` als GitHub Secret `DEPLOY_HOST_KEY` speichern. Nicht ungeprüft die Ausgabe eines beliebigen ssh-keyscan-Aufrufs übernehmen.

Unter GitHub Repository Settings > Secrets and variables > Actions anlegen:
- Variables: DEPLOY_HOST = 217.154.240.41, DEPLOY_USER = bustrinker-deploy
- Secrets: DEPLOY_SSH_KEY (privater Deployment-Schlüssel), DEPLOY_HOST_KEY (verifizierte known_hosts-Zeile)
- Optional: GitHub Environment `production` anlegen und auf `main` einschränken. Falls Environment-Approvals aktiviert sind, wird jeder Deploy manuell bestätigt; für vollautomatische Deployments keine Approvals aktivieren.

## Domain, Nginx und HTTPS

Beim DNS-Provider A-Records für bustrinker.de und www auf 217.154.240.41 setzen. Abweichende AAAA-Records entfernen oder korrekt auf eine funktionierende IPv6-Adresse setzen.

Die Datei `deploy/nginx-bustrinker.conf` aus dem Repository als `/etc/nginx/sites-available/bustrinker` auf den VPS kopieren; die Schritte unten erst nach einem ersten erfolgreichen Deployment ausführen. Falls noch keine Release da ist, als Zwischenlösung eine kleine index.html in /var/www/bustrinker/bootstrap anlegen und `current` temporär dorthin verlinken.

```bash
ln -s /etc/nginx/sites-available/bustrinker /etc/nginx/sites-enabled/bustrinker
nginx -t && systemctl reload nginx
certbot --nginx -d bustrinker.de -d www.bustrinker.de
certbot renew --dry-run
```

Ein eventuell vorhandenes Default-VHost-Konfigurationsfile in sites-enabled deaktivieren, wenn es mit den Domains kollidiert. Bei Problemen zuerst `nginx -t` und `journalctl -u nginx` prüfen.

## Veröffentlichung und Umzug

Workflow: `.github/workflows/deploy-vps.yml`. Sobald der Workflow in main vorhanden und die Secrets gesetzt sind, veröffentlicht jeder Push nach erfolgreichem `npm test`. `workflow_dispatch` erlaubt einen manuellen Erstlauf. Vor der DNS-Umschaltung kann man über einen lokalen Hosts-Datei-Eintrag testen.

Erst nach funktionierendem HTTPS, Online-Lobby und Test der bestehenden Links GitHub Pages deaktivieren und das Repository auf **private** stellen. Eine zuvor öffentliche Git-Historie, Forks und Klone bleiben dadurch nicht rückwirkend geheim. Exponierte echte Geheimnisse rotieren.

### Sicherheit
- Die Website ist weiterhin öffentlich und enthält sämtlichen im Browser ausgelieferten JS-Code. Firebase-Web-API-Keys sind Client-Konfiguration, keine serverseitigen Geheimnisse; Firestore Security Rules, Authentifizierung, Quoten und gegebenenfalls App Check müssen separat geprüft werden.
- Aktuell handelt es sich um eine statische Seite; der VPS allein macht die Firebase-Lobby nicht zu einem selbst gehosteten Backend.
- Bei einem Fehlschlag vor der Symlink-Umschaltung bleibt die letzte Version online. Zur Rückkehr auf eine ältere Version den current-Symlink auf ein vorhandenes Release ändern.
- Nginx- und SSH-Konfiguration sowie Zugangsdaten nicht in der Webroot bereitstellen.
