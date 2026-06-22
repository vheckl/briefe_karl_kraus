<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    exclude-result-prefixes="xs"
    version="2.0">
    <!-- Render page breaks as images -->
    <xsl:template match="tei:pb">
        <xsl:variable name="gid" select="substring-after(@facs, '#')" />
        <xsl:variable name="g"
            select="/tei:TEI/tei:facsimile/tei:surface[@xml:id = $gid]/tei:graphic" />
        <div class="pb-image-wrap">
            <img class="pb-image"
                src="{$g/@url}"
                alt="{concat('Seitenbild: ', $gid)}" />
        </div>
    </xsl:template>
</xsl:stylesheet>