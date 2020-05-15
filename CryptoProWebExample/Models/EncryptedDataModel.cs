using CryptoPro.Sharpei;
using System;
using System.Collections;
using System.Linq;
using System.Management.Instrumentation;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Web.DynamicData;

namespace CryptoProWebExample.Models
{
	public class EncryptedDataModel
	{
		#region Public properties
		
		
		
		public string sessionKeyDiversData { get; set; }

		public string sessionKeyIV { get; set; }

		public string dataEncrypted { get; set; }

		public string encryptedSessionKey { get; set; }

		public string thumbprintCertificate { get; set; }

		public string thumbprintAnswerCertificate { get; set; }



		#endregion
		#region Private methods



		private X509Certificate2 _getCertificate(string sThumbprint)
		{
			X509Certificate2 retVal = null;
			X509Store store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
			store.Open(OpenFlags.OpenExistingOnly);
			var certs = store.Certificates.Find(X509FindType.FindByThumbprint, sThumbprint, true);
			if (certs.Count > 0)
			{
				retVal = certs[0];
			}
			return retVal;
		}

		private static byte[] TrimArray(byte[] targetArray)
		{
			IEnumerator enum1 = targetArray.GetEnumerator();
			int i = 0;
			while (enum1.MoveNext())
			{
				if (enum1.Current.ToString().Equals("0"))
				{
					break;
				}
				i++;
			}
			byte[] returnedArray = new byte[i];
			for (int j = 0; j < i; j++)
			{
				returnedArray[j] = targetArray[j];
			}
			return returnedArray;
		}



		#endregion
		#region Public methods



		public X509Certificate2 GetCertificate()
		{
			return _getCertificate(thumbprintCertificate);
		}

		public X509Certificate2 GetAnswerCertificate()
		{
			return _getCertificate(thumbprintAnswerCertificate);
		}

		public byte[] GetMessage()
		{
			EnvelopedCms envelopedCms = new EnvelopedCms();
			envelopedCms.Decode(Convert.FromBase64String(dataEncrypted));
			envelopedCms.Decrypt(envelopedCms.RecipientInfos[0]);
			return envelopedCms.ContentInfo.Content;
		}

		public void EncryptAnswer(byte[] answerData)
		{
			X509Certificate2 certificate = GetAnswerCertificate();

			ContentInfo contentInfo = new ContentInfo(answerData);
			EnvelopedCms envelopedCms = new EnvelopedCms(contentInfo);
			CmsRecipient recipient = new CmsRecipient(
				SubjectIdentifierType.IssuerAndSerialNumber,
				certificate);
			envelopedCms.Encrypt(recipient);
			byte[] answer = envelopedCms.Encode();

			dataEncrypted = Convert.ToBase64String(answer);
			sessionKeyIV = String.Empty;
			sessionKeyDiversData = String.Empty;
			encryptedSessionKey = String.Empty;
		}

		public byte[] DecryptMessage()
		{
			X509Certificate2 cert = GetCertificate();

			Gost3410_2012_256 assym = cert.PrivateKey as Gost3410_2012_256;

			var s_parts = encryptedSessionKey.Split(':');
			var parts = encryptedSessionKey.Split(':').Select(part => part.Split(' ').Select(e => Convert.ToByte(e, 16)).ToArray()).ToArray();
			//0 - Параметры шифрования ключа обмена. Компонент является результатом выполнения CryptGetKeyParam(KP_CIPHEROID).
			//1 - Эфемерный открытый ключ, который использовался для выработки ключа обмена. Компонент является результатом выполнения CryptExportKey(PUBLICKEYBLOBEX).
			//2 - Симметричный ключ, зашифрованный на ключе обмена. Компонент является результатом выполнения CryptExportKey(SIMPLEBLOB).
			//
			//   -=PUBLICKEYBLOB=-
			// BYTE bPublicKeyBlob[] =
			// {
			//		0x06, // bType = PUBLICKEYBLOB
			//		0x20, // bVersion = 0x20
			//		0x00, 0x00, // reserved
			//		0x23, 0x2E, 0x00, 0x00, // KeyAlg = ALG_SID_GR3410EL
			//		0x4D, 0x41, 0x47, 0x31, // Magic = GR3410_1_MAGIC
			//		0x00, 0x02, 0x00, 0x00, // BitLen = 512
			//		bASN1GostR3410_94_PublicKeyParameters
			//		0x30, 0x12,
			//		0x06, 0x07,
			//		0x2A, 0x85, 0x03, 0x02, 0x02, 0x24, 0x00,
			//		0x06, 0x07,
			//		0x2A, 0x85, 0x03, 0x02, 0x02, 0x1E, 0x01,
			//		bPublicKey
			//		0x2D, 0xC3, 0xFD, 0xF6, 0x9C, 0x91, 0x3D, 0xCC,
			//		0xB6, 0x53, 0x26, 0x8E, 0x51, 0x2F, 0x5E, 0xDD,
			//		0xE4, 0x1A, 0x5D, 0xB3, 0x58, 0x3C, 0xDF, 0x60,
			//		0x68, 0xF2, 0x48, 0xA2, 0xB0, 0xB8, 0xDE, 0x7B,
			//		0xC9, 0xAA, 0x20, 0xE3, 0xCF, 0x63, 0xDF, 0x5F,
			//		0x39, 0x55, 0x21, 0xE0, 0xA0, 0xDD, 0x85, 0x3E,
			//		0x0A, 0xAF, 0x44, 0xFA, 0x49, 0x3C, 0xD5, 0x4C,
			//		0xA8, 0x04, 0x8D, 0x1D, 0x9C, 0x41, 0x85, 0xFB
			//	};
			//
			// BYTE bEncryptionParamSet[] = {
			//		0x30, 0x09, // SEQUENCE (размер 0x09)
			//		0x06, 0x07, // OBJECT IDENTIFIER,  (размер 0x07)
			//		0x2a, 0x85, 0x03, 0x02, 0x02, 0x1f, 0x01 // 1.2.643.2.2.31.1
			//	};
			//  -=SIMPLEBLOB=-
			//	BYTE bSimpleBlob[] =
			//	{
			//		0x01, // bType = SIMPLEBLOB
			//      0x20, // bVersion = 0x20
			//      0x00, 0x00, // reserved
			//      0x23, 0x2e, 0x00, 0x00, // KeyAlg = ALG_SID_GR3410EL
			//      0x4d, 0x41, 0x47, 0x31, // Magic = GR3410_1_MAGIC
			//      0x1e, 0x66, 0x00, 0x00, // EncryptKeyAlgId = CALG_G28147
			//      0x76, 0xee, 0xb4, 0x6b, 0x1b, 0x10, 0x36, 0xeb, // bUKM
			//      // pbEncryptedKey
			//      0x5e, 0x70, 0x73, 0x5f, 0x36, 0x98, 0xb4, 0x35,
			//		0x5b, 0x45, 0x03, 0x7f, 0xa7, 0xce, 0x00, 0x97,
			//		0x11, 0x5e, 0x45, 0xc6, 0x58, 0x59, 0x94, 0x72,
			//		0x66, 0x42, 0x06, 0x3f, 0x72, 0x3a, 0xb4, 0x9e,
			//		0x8c, 0x86, 0x08, 0x84, // pbMacKey
			//      0x30, 0x09, 0x06, 0x07, 0x2a, 0x85, 0x03, 0x02, 0x02, 0x1f, 0x01 // bEncryptionParamSet
			//  };

			Gost2012_256KeyExchangeDeformatter Deformatter = new Gost2012_256KeyExchangeDeformatter(assym);
			GostKeyTransport encKey = new GostKeyTransport();
			//0- 31 2E 32 2E 36 34 33 2E 37 2E 31 2E 32 2E 35 2E 31 2E 31 00
			//1- 0A 20 00 00 49 2E 00 00 4D 41 47 31 00 02 00 00 30 13 06 07 2A 85 03 02 02 24 00 06 08 2A 85 03 07 01 01 02 02 8B FF 19 01 0B CF BB C9 03 59 58 D0 6F 24 C1 3C 5D 1F AC 9B F8 F7 24 7B 48 4E 39 2E 9A 42 B6 66 60 CA D8 0E 62 7E 22 15 CC C9 E5 A6 2E 58 FF 9B 1D FB EA 7B 5E 42 B5 FD 51 97 BD D9 6E 24 16 AC
			//
			//0A PUBLICKEYBLOBEX
			//20 Version
			//00 00 Reserved
			//49 2E 00 00 // KeyAlg = ???
			//4D 41 47 31 // Magic = GR3410_1_MAGIC
			//00 02 00 00 // EncryptKeyAlgId
			//30 ???
			//13 Length for Oids
			//06 07 2A 85 03 02 02 24 00 // OId ??? 1.2.643.2.2.36.0 PublicKeyParamSet
			//06 08 2A 85 03 07 01 01 02 02 // OId ??? 1.2.643.7.1.1.2.2 DigestParamSet
			//8B FF 19 01 0B CF BB C9 //PublicKey
			//03 59 58 D0 6F 24 C1 3C 
			//5D 1F AC 9B F8 F7 24 7B 
			//48 4E 39 2E 9A 42 B6 66 
			//60 CA D8 0E 62 7E 22 15 
			//CC C9 E5 A6 2E 58 FF 9B 
			//1D FB EA 7B 5E 42 B5 FD 
			//51 97 BD D9 6E 24 16 AC
			//
			//2- 01 20 00 00 1E 66 00 00 FD 51 4A 37 1E 66 00 00 6A 0F 44 24 B6 CB 8B 7C 91 8B D1 55 2D 7D 07 67 6F 03 42 8E DC BE D0 9B 84 BA 8E 04 E7 FA 3A 2A 9B 2C F6 F1 71 86 3D F6 4E 32 52 65 30 09 06 07 2A 85 03 02 02 1F 01"
			//
			//01 SIMPLEBLOB
			//20 Version
			//00 00 Reserved
			//1E 66 00 00 KeyAlg
			//FD 51 4A 37 Magic
			//1E 66 00 00 EncryptKeyAlgId
			//6A 0F 44 24 B6 CB 8B 7C UKM
			//91 8B D1 55 2D 7D 07 67 EncryptedKey
			//6F 03 42 8E DC BE D0 9B 
			//84 BA 8E 04 E7 FA 3A 2A 
			//9B 2C F6 F1 71 86 3D F6 
			//4E 32 52 65 MacKey
			//30 09 06 07 2A 85 03 02 02 1F 01 EncryptionParamSet
			encKey.SessionEncryptedKey.Ukm = new byte[] { 0x6A, 0x0F, 0x44, 0x24, 0xB6, 0xCB, 0x8B, 0x7C };
			encKey.SessionEncryptedKey.EncryptedKey = new byte[] { 0x91, 0x8B, 0xD1, 0x55, 0x2D, 0x7D, 0x07, 0x67, 0x6F, 0x03, 0x42, 0x8E, 0xDC, 0xBE, 0xD0, 0x9B, 0x84, 0xBA, 0x8E, 0x04, 0xE7, 0xFA, 0x3A, 0x2A, 0x9B, 0x2C, 0xF6, 0xF1, 0x71, 0x86, 0x3D, 0xF6 };
			encKey.SessionEncryptedKey.Mac = new byte[] { 0x4E, 0x32, 0x52, 0x65 };
			encKey.SessionEncryptedKey.EncryptionParamSet = "1.2.643.2.2.31.1";
			encKey.TransportParameters.DigestParamSet = "1.2.643.7.1.1.2.2";
			encKey.TransportParameters.PublicKey = new byte[] { 0x8B, 0xFF, 0x19, 0x01, 0x0B, 0xCF, 0xBB, 0xC9, 0x03, 0x59, 0x58, 0xD0, 0x6F, 0x24, 0xC1, 0x3C, 0x5D, 0x1F, 0xAC, 0x9B, 0xF8, 0xF7, 0x24, 0x7B, 0x48, 0x4E, 0x39, 0x2E, 0x9A, 0x42, 0xB6, 0x66, 0x60, 0xCA, 0xD8, 0x0E, 0x62, 0x7E, 0x22, 0x15, 0xCC, 0xC9, 0xE5, 0xA6, 0x2E, 0x58, 0xFF, 0x9B, 0x1D, 0xFB, 0xEA, 0x7B, 0x5E, 0x42, 0xB5, 0xFD, 0x51, 0x97, 0xBD, 0xD9, 0x6E, 0x24, 0x16, 0xAC };
			encKey.TransportParameters.PublicKeyParamSet = "1.2.643.2.2.36.0";

			Gost28147 key = (Gost28147)Deformatter.DecryptKeyExchange(encKey);
			key.IV = sessionKeyIV.Split(' ').Select(c => Convert.ToByte(c, 16)).ToArray();
			//byte[] encBytes = Enumerable.Range(0, dataEncrypted.Length)
			//					.Where(x => x % 2 == 0)
			//					.Select(x => Convert.ToByte(dataEncrypted.Substring(x, 2), 16))
			//					.ToArray();
			byte[] encBytes = Convert.FromBase64String(dataEncrypted);

			byte[] targetBytes = new byte[1024];
			int currentPosition = 0;

			CPCryptoAPITransform cryptoTransform =
				(CPCryptoAPITransform)key.CreateDecryptor();

			int inputBlockSize = cryptoTransform.InputBlockSize;
			int sourceByteLength = encBytes.Length;

			try
			{
				int numBytesRead = 0;
				while (sourceByteLength - currentPosition >= inputBlockSize)
				{
					numBytesRead = cryptoTransform.TransformBlock(
						encBytes,
						currentPosition,
						inputBlockSize,
						targetBytes,
						currentPosition);

					currentPosition += numBytesRead;
				}

				byte[] finalBytes = cryptoTransform.TransformFinalBlock(
					encBytes,
					currentPosition,
					sourceByteLength - currentPosition);

				finalBytes.CopyTo(targetBytes, currentPosition);
			}
			catch (Exception ex)
			{
				Console.WriteLine("Caught unexpected exception:" + ex.ToString());
			}
			byte[] retVal = TrimArray(targetBytes);
			return retVal;
		}



		#endregion
	}
}