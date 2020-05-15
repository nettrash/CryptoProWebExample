using System;
using CryptoProWebExample.Models;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace CryptoProWebExampleTest
{
	[TestClass]
	public class ExchangeTest
	{
		[TestMethod]
		public void DecryptTest()
		{
			EncryptedDataModel data = new EncryptedDataModel();
			data.dataEncrypted = "7516C729";
			data.encryptedSessionKey = "31 2E 32 2E 36 34 33 2E 37 2E 31 2E 32 2E 35 2E 31 2E 31 00:0A 20 00 00 49 2E 00 00 4D 41 47 31 00 02 00 00 30 13 06 07 2A 85 03 02 02 24 00 06 08 2A 85 03 07 01 01 02 02 8B FF 19 01 0B CF BB C9 03 59 58 D0 6F 24 C1 3C 5D 1F AC 9B F8 F7 24 7B 48 4E 39 2E 9A 42 B6 66 60 CA D8 0E 62 7E 22 15 CC C9 E5 A6 2E 58 FF 9B 1D FB EA 7B 5E 42 B5 FD 51 97 BD D9 6E 24 16 AC:01 20 00 00 1E 66 00 00 FD 51 4A 37 1E 66 00 00 6A 0F 44 24 B6 CB 8B 7C 91 8B D1 55 2D 7D 07 67 6F 03 42 8E DC BE D0 9B 84 BA 8E 04 E7 FA 3A 2A 9B 2C F6 F1 71 86 3D F6 4E 32 52 65 30 09 06 07 2A 85 03 02 02 1F 01";
			data.sessionKeyDiversData = "B8 7B 7B 8A EF FC 3F 57 C9 F7 7C 48 E0 98 D9 47 31 8D 18 8F B2 88 86 2B ED 8A EF 78 B1 92 DE DB 2F C0 E6 4A 3C 3F A8 0D";
			data.sessionKeyIV = "0A 52 77 BB E6 B4 67 F4";
			data.thumbprintAnswerCertificate = "7111A95738C2B630943AE0A38CFF80E6E79174DA";
			data.thumbprintCertificate = "76DE6C7FE2D577432B12C527E50DCC532378EBEE";
			Assert.AreEqual(System.Text.Encoding.Default.GetString(data.DecryptMessage()), "test");
		}

		[TestMethod]
		public void EncryptTest()
		{
			//EncryptedDataModel data = new EncryptedDataModel();
			//data.thumbprintAnswerCertificate = "7111A95738C2B630943AE0A38CFF80E6E79174DA";
			//data.thumbprintCertificate = "76DE6C7FE2D577432B12C527E50DCC532378EBEE";
			//data.EncryptAnswer(System.Text.Encoding.UTF8.GetBytes("test passed"));
		}
	}
}
