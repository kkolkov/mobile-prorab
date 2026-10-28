package ru.prorab.pricing.service;

import org.springframework.stereotype.Service;
import ru.prorab.pricing.entity.PriceMatrixEntry;
import ru.prorab.pricing.repository.PriceMatrixRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
public class PriceCatalog {
    private final PriceMatrixRepository repository;
    public PriceCatalog(PriceMatrixRepository repository){this.repository=repository;}
    public record Rate(String code,String unit,BigDecimal price,BigDecimal roughShare,BigDecimal laborShare,String source,LocalDate date,boolean verified) {}
    public record Snapshot(String version, Map<String,Rate> rates) {
        public boolean verified(){return rates.values().stream().allMatch(Rate::verified);}
        public Rate rate(String code){Rate r=rates.get(code);if(r==null)throw new IllegalStateException("Missing price: "+code);return r;}
    }
    public Snapshot snapshot(){
        Map<String,Rate> rates=new TreeMap<>();
        for(PriceMatrixEntry p:repository.findAll()){
            rates.put(p.getCode(),new Rate(p.getCode(),p.getUnit(),p.getUnitPriceRub(),p.getRoughShare(),p.getLaborShare(),p.getSourceNote(),p.getPriceDate(),p.isVerified()));
        }
        try {
            String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(rates.toString().getBytes(StandardCharsets.UTF_8)));
            return new Snapshot("price-matrix-"+hash.substring(0,16),Map.copyOf(rates));
        }catch(java.security.NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
    }
}
