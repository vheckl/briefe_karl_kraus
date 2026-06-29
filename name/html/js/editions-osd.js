(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        // bloß auf Seiten mit OSD-Container und geladener OSD-js-Bibliothek aktivieren
        var viewerElement = document.getElementById("osd-viewer");
        if (!viewerElement || typeof OpenSeadragon === "undefined") {
            console.warn("[OSD] Initialisierung übersprungen: #osd-viewer oder OpenSeadragon fehlt.");
            console.info("[OSD] Prüfe, ob editions.xsl den Viewer-Container rendert und ob die OSD-Script-Datei geladen wurde.");
            return;
        }

        // Alle PB-Marker einsammeln, die eine aufgelöste Bild-URL besitzen.
        var rawMarkers = Array.prototype.slice.call(
            document.querySelectorAll(".pb.osd-marker")
        );

        if (!rawMarkers.length) {
            console.warn("[OSD] Keine .pb.osd-marker gefunden.");
            console.info("[OSD] Mögliche Ursache: TEI-PB werden im XSLT nicht als Marker ausgegeben oder die falsche HTML-Datei ist geöffnet.");
        }

        rawMarkers.forEach(function (marker, idx) {
            var facs = marker.dataset.osdFacs || marker.getAttribute("source") || "(leer)";
            var img = marker.dataset.osdImage || "";
            if (!img.trim()) {
                console.warn("[OSD] Marker ohne data-osd-image ignoriert (Index " + idx + ", facs: " + facs + ").");
                console.info("[OSD] Prüfe im XML: <pb facs=...> und <facsimile><graphic xml:id=... url=.../> müssen zusammenpassen.");
            }
            if (!marker.dataset.osdFacs) {
                console.warn("[OSD] Marker ohne data-osd-facs gefunden (Index " + idx + ").");
            }
        });

        var markers = rawMarkers.filter(function (el) {
            return Boolean(el.dataset.osdImage && el.dataset.osdImage.trim());
        });

        if (!markers.length) {
            console.warn("[OSD] Abbruch: Es gibt keine verwertbaren Marker mit data-osd-image.");
            console.info("[OSD] Tipp: Öffne die DevTools und suche nach '.pb.osd-marker' im DOM oder prüfe die erzeugte HTML-Datei.");
            return;
        }

        console.info("[OSD] Marker gefunden:", markers.length);

        // OpenSeadragon starten / Objekt initialisieren
        var viewer = OpenSeadragon({
            id: "osd-viewer",
            prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@5.0/build/openseadragon/images/",
            animationTime: 0.9,
            blendTime: 0.2,
            crossOriginPolicy: "Anonymous",
            showNavigator: true,
            navigatorPosition: "BOTTOM_RIGHT",
            minZoomLevel: 0.5,
            maxZoomLevel: 40,
            visibilityRatio: 1,
            constrainDuringPan: true
        });

        var currentImageUrl = "";
        var pbByFacs = {};

        Array.prototype.slice.call(document.querySelectorAll(".pb[source]")).forEach(function (pb) {
            var facs = pb.getAttribute("source");
            if (!pbByFacs[facs]) {
                pbByFacs[facs] = [];
            }
            pbByFacs[facs].push(pb);
        });

        // Hinweise auf inkonsistente PB-Referenzen zwischen Markern und Textlabels.
        var markerFacsSet = new Set(
            markers.map(function (m) {
                return m.dataset.osdFacs || "";
            }).filter(Boolean)
        );
        markerFacsSet.forEach(function (facs) {
            if (!pbByFacs[facs]) {
                console.warn("[OSD] Für Marker-facs gibt es kein passendes .pb[source]:", facs);
            }
        });

        // geladenes Bild über farbigen PB im Text visuell markieren.
        function setActivePb(facsId) {
            Array.prototype.slice.call(document.querySelectorAll(".pb.is-active")).forEach(function (pb) {
                pb.classList.remove("is-active");
            });
            if (facsId && pbByFacs[facsId]) {
                pbByFacs[facsId].forEach(function (pb) {
                    pb.classList.add("is-active");
                });
            }
        }

        // bild neu laden wenn sich die URL ändernt
        function openImage(url, facsId) {
            if (!url || url === currentImageUrl) {
                if (!url) {
                    console.warn("[OSD] Bildwechsel übersprungen: leere URL (facs: " + (facsId || "?") + ").");
                }
                setActivePb(facsId);
                return;
            }
            currentImageUrl = url;
            viewer.open({ type: "image", url: url });
            setActivePb(facsId);
        }

        // daten aus den beobachteten Markern laden
        function markerToData(marker) {
            return {
                url: marker.dataset.osdImage,
                facsId: marker.dataset.osdFacs || ""
            };
        }

        // fallback: falls observer gerade keinen aktiven Marker liefert,
        // wird bild rein über die aktuelle scrollposition bestimmt
        function updateByPositionFallback() {
            // im oberen Randbereich (<= 5px) immer auf das erste Faksimile springen,
            // damit beim Zurückscrollen kein späteres Bild "hängen bleibt".
            if (window.scrollY <= 5) {
                var firstAtTop = markerToData(markers[0]);
                openImage(firstAtTop.url, firstAtTop.facsId);
                return;
            }

            // aktivierungslinie innerhalb des viewports (bei 35% der Fensterhöhe ab oberem Rand):
            // marker oberhalb dieser linie gelten als "bereits gelesen".
            var activationLine = window.scrollY + window.innerHeight * 0.35;

            // startkandidat bei laden der seite ist der erste Marker (falls noch keiner linie erreicht hat)
            var candidate = markers[0];

            // Dokumentposition für alle Marker bestimmen und den letzten marker wählen,
            // der die Aktivierungslinie bereits überschritten hat.
            markers.forEach(function (marker) {
                // Marker-Position relativ zum gesamten Dokument (nicht nur zum Viewport)
                var docTop = Math.round(marker.getBoundingClientRect().top + window.scrollY);
                if (docTop <= activationLine) {
                    candidate = marker;
                }
            });

            // Gewählten Marker in Bild- und faksimile-Daten übersetzen und laden
            var active = markerToData(candidate);
            openImage(active.url, active.facsId);
        }

        var intersecting = new Set();

        // auswahl aktuell sichtbarer marker
        // das hier ist der zentrale „schalter“ für den bildwechsel
        function applyObserverSelection() {
            // sonderfall Seitenanfang:
            // damit beim schnellen nach oben springen nicht kurz ein späteres Bild bleibt,
            // wird hier explizit immer 0 = erstes Bild erzwungen
            if (window.scrollY <= 5) {
                var firstAtTop = markerToData(markers[0]);
                openImage(firstAtTop.url, firstAtTop.facsId);
                return;
            }

            // falls aktuell kein marker im observer-fenster liegt,
            // greifen wir auf die positionsbasierte fallback-logik zurück.
            if (!intersecting.size) {
                console.debug("[OSD] Kein Marker im Observer-Fenster, nutze Positions-Fallback.");
                updateByPositionFallback();
                return;
            }

            // allen markern herausfiltern, die gerade als "intersecting" sind
            var visible = markers.filter(function (marker) {
                return intersecting.has(marker);
            });

            if (!visible.length) {
                console.warn("[OSD] intersecting-Set befüllt, aber keine sichtbaren Marker nach Filterung.");
                updateByPositionFallback();
                return;
            }

            // sichtbare marker nach ihrer vertikalen position im viewport sortieren
            // (oben -> unten), damit der „letzte“ marker eindeutig ist.
            visible.sort(function (a, b) {
                return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
            });

            // bei mehreren sichtbaren markern den zuletzt sichtbaren nehmen -> Lesefluss
            var active = markerToData(visible[visible.length - 1]);
            openImage(active.url, active.facsId);
        }

        // dieser intersectionobserver registriert, welche marker im „aktiven“ bereich liegen
        // hier wird dieses aktive fenster definiert
        var observer = new IntersectionObserver(
            function (entries) {
                // jede observer-meldung enthält ein-/austritte mehrerer marker
                // wir können dadadurch ein aktuelles set der sichtbaren marker erzeugen
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        intersecting.add(entry.target);
                        console.debug("[OSD-Observer] Marker intersecting:", entry.target.dataset.osdFacs || entry.target.textContent.trim() || "pb");
                    } else {
                        intersecting.delete(entry.target);
                        console.debug("[OSD-Observer] Marker NOT intersecting:", entry.target.dataset.osdFacs || entry.target.textContent.trim() || "pb");
                    }
                });

                // nach jedem observer-update sofort neu entscheiden,
                // welches bild angezeigt werden soll
                applyObserverSelection();
            },
            {
                // root = null bedeutet: Beobachtung relativ zum Browser-Viewport.
                root: null,
                // rootMargin verschiebt den effektiven Beobachtungsbereich:
                // oben -15%, unten -65% => aktiver Streifen liegt eher im oberen Mittelteil.
                // So wechseln Bilder früher/stabiler im Lesefluss.
                rootMargin: "-15% 0px -65% 0px",
                // threshold 0: Es reicht bereits ein minimaler Eintritt,
                // um als "intersecting" zu gelten.
                threshold: 0

            }
        );

        // jeden marker für Observer registrieren.
        markers.forEach(function (marker) {
            observer.observe(marker);
        });

        console.info("[OSD] Observer registriert für Marker:", markers.length);

        // Bei Scroll/Resize neu auswerten; initial direkt synchronisieren.
        window.addEventListener("scroll", applyObserverSelection, { passive: true });
        window.addEventListener("resize", applyObserverSelection);
        applyObserverSelection();

        // -----------------------------------------------------------------------
        // DEBUG-OVERLAY – Visualisieren des Observer-Fensters, kann auch gelöscht werden
        // -----------------------------------------------------------------------
        // Aufruf in der Browser-Konsole:
        //   window.osdDebug()        – Overlay einblenden
        //   window.osdDebug()        – nochmals aufrufen zum Ausblenden (Toggle)
        //
        // Das Overlay zeigt:
        //   - Das aktive Beobachtungsfenster des IntersectionObservers (blaues Band)
        //   - Alle PB-Marker: grün = gerade intersecting, rot = außerhalb des Fensters
        //
        // Mit freundlicher Unterstützung von LLMs :)
        // -----------------------------------------------------------------------
        var debugActive = false;
        var debugOverlayEl = null;
        var debugMarkerEls = [];
        var debugScrollHandler = null;

        window.osdDebug = function () {
            if (debugActive) {
                // Overlay und alle Marker-Hervorhebungen wieder entfernen.
                if (debugOverlayEl) {
                    debugOverlayEl.remove();
                    debugOverlayEl = null;
                }
                debugMarkerEls.forEach(function (el) { el.remove(); });
                debugMarkerEls = [];
                if (debugScrollHandler) {
                    window.removeEventListener("scroll", debugScrollHandler);
                    debugScrollHandler = null;
                }
                debugActive = false;
                console.info("[OSD-Debug] Overlay ausgeblendet.");
                return;
            }

            debugActive = true;
            console.info("[OSD-Debug] Overlay eingeblendet. Erneut aufrufen zum Ausblenden.");

            // --- Observer-Fenster-Band ---
            // rootMargin "-15% 0px -65% 0px" bedeutet:
            //   obere Grenze  = 15% ab viewport-Oberkante
            //   untere Grenze = 35% ab viewport-Oberkante  (100% - 65%)
            // Das blaue Band zeigt diesen Streifen.
            debugOverlayEl = document.createElement("div");
            Object.assign(debugOverlayEl.style, {
                position:        "fixed",
                left:            "0",
                width:           "100%",
                // obere Grenze des aktiven Streifens
                top:             "15%",
                // Höhe = 100% - 15% (oben) - 65% (unten) = 20%
                height:          "20%",
                background:      "rgba(30, 100, 255, 0.12)",
                borderTop:       "2px dashed rgba(30,100,255,0.6)",
                borderBottom:    "2px dashed rgba(30,100,255,0.6)",
                zIndex:          "9999",
                pointerEvents:   "none",
            });

            // Beschriftung des Bandes
            var label = document.createElement("span");
            Object.assign(label.style, {
                position:   "absolute",
                top:        "2px",
                left:       "8px",
                fontSize:   "11px",
                fontFamily: "monospace",
                color:      "rgba(30,100,255,0.9)",
            });
            label.textContent = "IntersectionObserver-Fenster (rootMargin: -15% / -65%)";
            debugOverlayEl.appendChild(label);
            document.body.appendChild(debugOverlayEl);

            // --- Marker-Punkte ---
            // Für jeden PB-Marker einen kleinen absolut positionierten Punkt erzeugen.
            // Grün = gerade im Set `intersecting`, Rot = außerhalb.
            function buildMarkerDots() {
                debugMarkerEls.forEach(function (el) { el.remove(); });
                debugMarkerEls = [];

                markers.forEach(function (marker) {
                    var rect = marker.getBoundingClientRect();
                    var dot = document.createElement("div");
                    var isIn = intersecting.has(marker);
                    Object.assign(dot.style, {
                        position:     "fixed",
                        left:         (rect.left + window.scrollX) + "px",
                        // Viewport-Position direkt verwenden (fixed-Positionierung)
                        top:          rect.top + "px",
                        width:        "14px",
                        height:       "14px",
                        borderRadius: "50%",
                        background:   isIn ? "rgba(0,200,80,0.85)" : "rgba(220,40,40,0.75)",
                        border:       "2px solid #fff",
                        zIndex:       "10000",
                        pointerEvents:"none",
                        transform:    "translate(-50%, -50%)",
                    });

                    // Tooltip mit facs-ID
                    dot.title = marker.dataset.osdFacs || "?";

                    // Kleine Label-Beschriftung neben dem Punkt
                    var dotLabel = document.createElement("span");
                    Object.assign(dotLabel.style, {
                        position:   "absolute",
                        left:       "16px",
                        top:        "-6px",
                        fontSize:   "10px",
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                        color:      isIn ? "rgba(0,160,60,1)" : "rgba(180,20,20,1)",
                        background: "rgba(255,255,255,0.85)",
                        padding:    "0 3px",
                        borderRadius: "3px",
                    });
                    dotLabel.textContent = (marker.textContent.trim() || marker.dataset.osdFacs || "pb");
                    dot.appendChild(dotLabel);
                    document.body.appendChild(dot);
                    debugMarkerEls.push(dot);
                });
            }

            buildMarkerDots();

            // Bei jedem Scroll die Marker-Punkte neu positionieren und Farbe aktualisieren.
            debugScrollHandler = function () { buildMarkerDots(); };
            window.addEventListener("scroll", debugScrollHandler, { passive: true });
        };
        // Aufruf-Hinweis in der Konsole ausgeben.
        console.info("[OSD-Debug] Lehr-Overlay verfügbar: window.osdDebug() in der Konsole aufrufen.");
    });
})();