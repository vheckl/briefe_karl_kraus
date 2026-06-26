<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    version="2.0"
    exclude-result-prefixes="xsl tei xs">

    <xsl:import href="./partials/shared.xsl" />
    <xsl:import href="./partials/html_navbar.xsl" />
    <xsl:import href="./partials/html_head.xsl" />
    <xsl:import href="./partials/html_footer.xsl" />
    <xsl:import href="./partials/blockquote.xsl" />
    <xsl:import href="./partials/zotero.xsl" />
    <xsl:output encoding="UTF-8" media-type="text/html" method="html" version="5.0" indent="yes"
        omit-xml-declaration="yes" />

    <xsl:template match="/">
        <xsl:variable name="prev"
            select="replace(tokenize(data(tei:TEI/@prev), '/')[last()], '.xml', '.html')" />
        <xsl:variable name="next"
            select="replace(tokenize(data(tei:TEI/@next), '/')[last()], '.xml', '.html')" />
        <xsl:variable name="teiSource">
            <xsl:choose>
                <xsl:when
                    test="normalize-space(data(tei:TEI/@xml:id)) and matches(data(tei:TEI/@xml:id), '\.xml$')">
                    <xsl:value-of select="data(tei:TEI/@xml:id)" />
                </xsl:when>
                <xsl:when test="normalize-space(data(tei:TEI/@xml:id))">
                    <xsl:value-of select="concat(data(tei:TEI/@xml:id), '.xml')" />
                </xsl:when>
                <xsl:otherwise>source.xml</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="link" select="replace($teiSource, '\.xml$', '.html')" />
        <xsl:variable name="doc_title" select=".//tei:titleStmt/tei:title[1]/text()" />

        <html class="h-100" lang="{$default_lang}">
            <head>
                <xsl:call-template name="html_head">
                    <xsl:with-param name="html_title" select="$doc_title"></xsl:with-param>
                </xsl:call-template>
                <link rel="stylesheet" href="css/editions-osd.css" type="text/css" />
                <xsl:call-template name="zoterMetaTags">
                    <xsl:with-param name="pageId" select="$link"></xsl:with-param>
                    <xsl:with-param name="zoteroTitle" select="$doc_title"></xsl:with-param>
                </xsl:call-template>
                <meta name="citation_author" content="Foo, Bar" />
                <meta name="citation_author" content="Bar, Foo" />
            </head>
            <body class="d-flex flex-column h-100">
                <xsl:call-template name="nav_bar" />
                <main class="flex-shrink-0 flex-grow-1">
                    <div class="container">
                        <div class="row">
                            <div class="col-md-2 col-lg-2 col-sm-12 text-start">
                                <xsl:if test="ends-with($prev,'.html')">
                                    <a>
                                        <xsl:attribute name="href">
                                            <xsl:value-of select="$prev" />
                                        </xsl:attribute>
                                        <i class="fs-2 bi bi-chevron-left"
                                            title="Zurück zum vorigen Dokument"
                                            visually-hidden="true">
                                            <span class="visually-hidden">Zurück zum vorigen
                                                Dokument</span>
                                        </i>
                                    </a>
                                </xsl:if>
                            </div>
                            <div class="col-md-8 col-lg-8 col-sm-12 text-center">
                                <h2>
                                    <xsl:value-of select="$doc_title" />
                                </h2>
                                <div>
                                    <a href="{$teiSource}">
                                        <i class="bi bi-download fs-2" title="Zum TEI/XML Dokument"
                                            visually-hidden="true">
                                            <span class="visually-hidden">Zum TEI/XML Dokument</span>
                                        </i>
                                    </a>
                                </div>
                            </div>
                            <div class="col-md-2 col-lg-2 col-sm-12 text-end">
                                <xsl:if test="ends-with($next, '.html')">
                                    <a>
                                        <xsl:attribute name="href">
                                            <xsl:value-of select="$next" />
                                        </xsl:attribute>
                                        <i class="fs-2 bi bi-chevron-right"
                                            title="Weiter zum nächsten Dokument"
                                            visually-hidden="true">
                                            <span class="visually-hidden">Weiter zum nächsten
                                                Dokument</span>
                                        </i>
                                    </a>
                                </xsl:if>
                            </div>
                        </div>

                        <!-- OSD two-column layout -->
                        <div class="row g-4 editions-layout flex-nowrap">
                            <!-- Left column: fixed OpenSeadragon viewer -->
                            <div class="col-5 editions-viewer-col">
                                <aside class="osd-column">
                                    <div id="osd-viewer" class="osd-viewer"
                                        aria-label="Faksimileansicht"></div>
                                </aside>
                            </div>
                            <!-- Right column: TEI text with PB markers -->
                            <div class="col-7 editions-text-col">
                                <div class="editions-text-column"
                                    data-letter="{.//tei:idno[@type='objid']}">
                                    <xsl:apply-templates select=".//tei:body"></xsl:apply-templates>
                                    <xsl:if
                                        test=".//tei:body//tei:unclear or .//tei:body//tei:subst">
                                        <div class="editorial-note">
                                            <xsl:if test=".//tei:body//tei:unclear">
                                                <p><span class="unclear-example">Wort</span> = unsichere Lesart</p>
                                            </xsl:if>
                                            <xsl:if test=".//tei:body//tei:subst">
                                                <p>[j] = überschriebener Buchstabe</p>
                                            </xsl:if>
                                        </div>
                                    </xsl:if>
                                    <p style="text-align:center;">
                                        <xsl:for-each select=".//tei:body//tei:note[not(./tei:p)]">
                                            <div class="footnotes">
                                                <xsl:element name="a">
                                                    <xsl:attribute name="name">
                                                        <xsl:text>fn</xsl:text>
                                                        <xsl:number level="any" format="1" count="tei:note"/>
                                                    </xsl:attribute>
                                                    <a>
                                                        <xsl:attribute name="href">
                                                            <xsl:text>#fna_</xsl:text>
                                                            <xsl:number level="any" format="1" count="tei:note"/>
                                                        </xsl:attribute>
                                                        <span style="font-size:7pt;vertical-align:super; margin-right: 0.4em">
                                                            <xsl:number level="any" format="1" count="tei:note"/>
                                                        </span>
                                                    </a>
                                                </xsl:element>
                                                <xsl:apply-templates/>
                                            </div>
                                        </xsl:for-each>
                                    </p>

                                    <xsl:for-each select="//tei:back">
                                        <div class="tei-back">
                                            <xsl:apply-templates />
                                        </div>
                                    </xsl:for-each>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="text-center p-4">
                        <xsl:call-template name="blockquote">
                            <xsl:with-param name="pageId" select="$link" />
                        </xsl:call-template>
                    </div>
                </main>
                <xsl:call-template name="html_footer" />
                <script
                    src="https://cdn.jsdelivr.net/npm/openseadragon@5.0/build/openseadragon/openseadragon.min.js"></script>
                <script src="js/editions-osd.js"></script>
            </body>
        </html>
    </xsl:template>

    <xsl:template match="tei:pb">
        <xsl:variable name="gid" select="replace(@facs, '^#', '')" />
        <xsl:variable name="image_url"
            select="string(/tei:TEI/tei:facsimile/tei:surface[@xml:id = $gid]/tei:graphic/@url)" />
        <xsl:variable name="foldClass" select="if (parent::tei:p) then ' pb-fold' else ''" />
        <xsl:choose>
            <xsl:when test="normalize-space($image_url)">
                <span class="pb osd-marker{$foldClass}" source="{$gid}" data-osd-facs="{$gid}"
                    data-osd-image="{$image_url}">
                    <xsl:value-of select="./@n" />
                </span>
                <xsl:if test="not(parent::tei:p)">
                    <br class="pb-break" />
                </xsl:if>
            </xsl:when>
            <xsl:otherwise>
                <span class="pb{$foldClass}" source="{$gid}">
                    <xsl:value-of select="./@n" />
                </span>
                <xsl:if test="not(parent::tei:p)">
                    <br class="pb-break" />
                </xsl:if>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

</xsl:stylesheet>