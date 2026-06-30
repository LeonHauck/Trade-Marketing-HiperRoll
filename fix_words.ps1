$files = @(
    "C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\app.js",
    "C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\index.html"
)

function Decode([string]$b64) {
    return [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($b64))
}

$replacements = @(
    # "HistÃ³rico", "Histórico"
    @("SGlzdMOzcmljbw==", "SGlzdMOzcmljbw==") # Wait, encoding "Histórico" in utf8 base64 -> SGlzdMOzcmljbw==
    # Ah, let me just do this programmatically.
)

# Since doing Base64 by hand is hard, I will write a Node.js script and execute it via powershell fetching a portable Node.js if node.exe isn't available? No, that's too much.

# How about using C# via Add-Type?
$csharp = @"
using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

public class EncodingFixer {
    public static void Fix(string file) {
        if (!File.Exists(file)) return;
        string content = File.ReadAllText(file, Encoding.UTF8);

        // Fix specific known words
        string[] bad = new string[] {
            "HistÃ³rico", "jÃ¡", "atÃ©", "observaÃ§Ã£o", "observaÃ§Ãµes",
            "EvoluÃ§Ã£o", "ResoluÃ§Ã£o", "AtualizaÃ§Ã£o", "ValidaÃ§Ã£o",
            "ediÃ§Ã£o", "aÃ§Ã£o", "AÃ§Ã£o", "RelatÃ³rios", "RelatÃ³rio",
            "MÃªs", "NÃ£o", "nÃ£o", "PadrÃ£o", "padrÃ£o", "sÃ³", "SÃ³",
            "estÃ¡", "EstÃ¡", "vocÃª", "VocÃª", "alÃ©m", "AlÃ©m",
            "TambÃ©m", "tambÃ©m", "InvÃ¡lido", "invÃ¡lido", "InformaÃ§Ãµes",
            "informaÃ§Ãµes", "OpÃ§Ãµes", "opÃ§Ãµes", "NÃºmero", "nÃºmero",
            "UsuÃ¡rio", "usuÃ¡rio", "MÃ¡ximo", "mÃ¡ximo", "MÃnimo", "mÃnimo",
            "Ãºltimo", "Ãšltimo", "Ãºnica", "Ãšnica", "Ãndice", "Ãndice",
            "Ã¡rea", "Ã rea", "ediï¿½ï¿½o", "observaï¿½ï¿½o", "observaï¿½ï¿½es",
            "evoluï¿½ï¿½o", "resoluï¿½ï¿½o", "atualizaï¿½ï¿½o", "validaï¿½ï¿½o",
            "aï¿½ï¿½o", "Aï¿½ï¿½o"
        };
        string[] good = new string[] {
            "Histórico", "já", "até", "observação", "observações",
            "Evolução", "Resolução", "Atualização", "Validação",
            "edição", "ação", "Ação", "Relatórios", "Relatório",
            "Mês", "Não", "não", "Padrão", "padrão", "só", "Só",
            "está", "Está", "você", "Você", "além", "Além",
            "Também", "também", "Inválido", "inválido", "Informações",
            "informações", "Opções", "opções", "Número", "número",
            "Usuário", "usuário", "Máximo", "máximo", "Mínimo", "mínimo",
            "último", "Último", "única", "Única", "índice", "Índice",
            "área", "Área", "edição", "observação", "observações",
            "evolução", "resolução", "atualização", "validação",
            "ação", "Ação"
        };

        for (int i = 0; i < bad.Length; i++) {
            content = content.Replace(bad[i], good[i]);
        }

        // Generic character replacements for the rest
        string[] badChars = new string[] {
            "Ã³", "Ã¡", "Ã©", "Ã§", "Ã£", "Ãµ", "Ã­", "Ãº", "Ãª", "Ã´", "Ã¢", "Ã ",
            "Ã“", "Ã ", "Ã‰", "Ã‡", "Ãƒ", "Ã•", "Ã ", "Ãš", "ÃŠ", "Ã”", "Ã‚", "Ã€"
        };
        string[] goodChars = new string[] {
            "ó", "á", "é", "ç", "ã", "õ", "í", "ú", "ê", "ô", "â", "à",
            "Ó", "Á", "É", "Ç", "Ã", "Õ", "Í", "Ú", "Ê", "Ô", "Â", "À"
        };

        for (int i = 0; i < badChars.Length; i++) {
            content = content.Replace(badChars[i], goodChars[i]);
        }

        File.WriteAllText(file, content, new UTF8Encoding(false));
    }
}
"@

Add-Type -TypeDefinition $csharp -Language CSharp
[EncodingFixer]::Fix("C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\app.js")
[EncodingFixer]::Fix("C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\index.html")
Write-Output "Done"
