using System;
using System.IO;
using System.Text;

public class CleanReverseFixer {
    public static void Fix(string file) {
        if (!File.Exists(file)) return;
        string content = File.ReadAllText(file, Encoding.UTF8);

        string[] bad2 = new string[] {
            "SǸ", "sǸ", "Cǭ", "cǭ", "Lǭ", "lǭ", "NǸ", "nǸ", 
            "TǭǸ", "tǭǸ", "Tǭ", "tǭ", "Mǭ", "mǭ", "Hǭ", "hǭ", 
            "Vǭ", "vǭ", "Jǭ", "jǭ"
        };
        
        string[] good2 = new string[] {
            "S", "s", "C", "c", "L", "l", "N", "n",
            "T", "t", "T", "t", "M", "m", "H", "h",
            "V", "v", "J", "j"
        };

        for (int i = 0; i < bad2.Length; i++) {
            content = content.Replace(bad2[i], good2[i]);
        }

        string[] badWords = new string[] {
            "Nǜo", "hǭ", "histrico", "Observaes", "Relatrio", "Responsǭvel",
            "INTELIGSNCIA", "Incio", "atǸ", "Composiǜo", "relatrio", "sltima",
            "Crtico", "notificaǜo", "Opo", "segurana", "EDIAO",
            "editǭveis", "mantǸm", "ediǜo", "tambǸm", "memria", "sessǜo",
            "validaǜo", "aps", "espao", "relatǸrio", "demonstraǜo", "botǜo",
            "reincidǦncias", "ǧltima", "Hǭ", "estatsticas", "padrǜo", "ttulo",
            "Alteraes", "VocǦ", "estǭ", "substituirǜo", "inconsistǦncia",
            "PrǸ-preenche", "assncrono", "crtico", "resoluǜo", "Evoluǜo",
            "Verificao", "rpida", "esto", "nǜo", "no", "est", "Voc",
            "Resoluo", "atualizao", "Atraso", "Atraso"
        };
        
        string[] goodWords = new string[] {
            "Não", "há", "histórico", "Observações", "Relatório", "Responsável",
            "INTELIGÊNCIA", "Início", "até", "Composição", "relatório", "Última",
            "Crítico", "notificação", "Opção", "segurança", "EDIÇÃO",
            "editáveis", "mantém", "edição", "também", "memória", "sessão",
            "validação", "após", "espaço", "relatório", "demonstração", "botão",
            "reincidências", "última", "Há", "estatísticas", "padrão", "título",
            "Alterações", "Você", "está", "substituirão", "inconsistência",
            "Pré-preenche", "assíncrono", "crítico", "resolução", "Evolução",
            "Verificação", "rápida", "estão", "não", "não", "está", "Você",
            "Resolução", "atualização", "Atraso", "Atraso"
        };
        
        for (int i = 0; i < badWords.Length; i++) {
            content = content.Replace(badWords[i], goodWords[i]);
        }
        
        content = content.Replace("ǭ", "á");
        content = content.Replace("Ǹ", "é");
        content = content.Replace("Ǧ", "ê");
        content = content.Replace("ǜ", "ã");

        File.WriteAllText(file, content, new UTF8Encoding(false));
    }
}
